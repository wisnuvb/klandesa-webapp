import { prisma } from "@/lib/prisma";
import type { ActionCard } from "@/lib/ai/laras-actions";
import { MAX_PROPOSALS_PER_TURN, proposeMailDecision } from "@/lib/ai/laras-mail";
import type { JsonCallResult } from "@/lib/mail/ai-call";
import { enrichRows } from "@/lib/mail/request-queue";
import { BATCH_SYSTEM, buildBatchUserMessage, parseBatchOutput, type BatchVerdict } from "@/lib/mail/request-assist";

/**
 * "Proses Cerdas": dari antrean yang siap diputuskan, server memilih permohonan yang BERSIH dari peringatan, meminta AI
 * menilai kecocokan jenis surat dengan keperluan (satu panggilan untuk semuanya), lalu menyiapkan USULAN setuju
 * (kartu bertanda tangan yang sama dengan Laras) hanya untuk yang dinilai "cocok". Tidak ada yang berubah sampai
 * perangkat desa memilih dan mengonfirmasi lewat /api/ai/actions/confirm.
 */

export const SMART_LIMIT = MAX_PROPOSALS_PER_TURN;

export type SmartProposal = {
  requestId: number;
  requestNumber: string;
  mailType: string;
  name: string;
  purpose: string;
  ageDays: number;
  reason: string;
  card: ActionCard;
};
export type SmartManual = { requestId: number; requestNumber: string; mailType: string; name: string; reasons: string[] };

export type SmartDeps = {
  reserve: () => Promise<boolean>;
  refund: () => Promise<void>;
  callModel: (system: string, user: string) => Promise<JsonCallResult>;
  addTokens: (n: number) => Promise<void>;
};

export type SmartOutcome =
  | { ok: true; proposals: SmartProposal[]; manual: SmartManual[]; considered: number; charged: boolean }
  | { ok: false; status: 402 | 502 | 504; error: string };

export async function runSmartProcess(
  args: { villageId: number; userId: number; ids?: number[] },
  deps: SmartDeps,
  now = new Date(),
): Promise<SmartOutcome> {
  const rows = await prisma.mailRequest.findMany({
    where: {
      villageId: args.villageId,
      status: "pending",
      OR: [{ rtStatus: null }, { rtStatus: "approved" }],
      ...(args.ids && args.ids.length > 0 ? { id: { in: args.ids.map((i) => BigInt(i)) } } : {}),
    },
    orderBy: { requestDate: "asc" },
    take: SMART_LIMIT,
  });
  const items = await enrichRows(args.villageId, rows, now);

  const manual: SmartManual[] = [];
  const candidates = items.filter((i) => {
    const c = i.checks;
    if (c && c.ready && c.warnings.length === 0) return true;
    manual.push({
      requestId: i.id,
      requestNumber: i.requestNumber,
      mailType: i.mailType,
      name: i.name,
      reasons: c ? [...c.blocking, ...c.warnings] : ["Tidak bisa diperiksa."],
    });
    return false;
  });
  if (candidates.length === 0) return { ok: true, proposals: [], manual, considered: items.length, charged: false };

  if (!(await deps.reserve())) return { ok: false, status: 402, error: "Kredit AI Anda habis. Tambah kredit di menu Langganan." };
  const fail = async (status: 502 | 504, error: string): Promise<SmartOutcome> => {
    await deps.refund();
    return { ok: false, status, error };
  };

  const call = await deps.callModel(
    BATCH_SYSTEM,
    buildBatchUserMessage(candidates.map((c) => ({ id: c.id, jenis_surat: c.mailType, keperluan: c.purpose, umur_hari: c.ageDays, peringatan: [] }))),
  );
  await deps.addTokens(call.tokens).catch(() => undefined);
  if (!call.ok) return fail(call.kind === "timeout" ? 504 : 502, "Asisten AI sedang bermasalah. Kredit tidak terpakai; coba lagi.");
  const verdicts = parseBatchOutput(call.text, candidates.map((c) => c.id));
  if (!verdicts) return fail(502, "Asisten tidak dapat menyusun hasil yang valid. Kredit tidak terpakai; coba lagi.");
  const verdictOf = new Map<number, BatchVerdict>(verdicts.map((v) => [v.id, v]));

  const proposals: SmartProposal[] = [];
  for (const c of candidates) {
    const v = verdictOf.get(c.id)!;
    if (v.tingkat !== "cocok") {
      manual.push({
        requestId: c.id,
        requestNumber: c.requestNumber,
        mailType: c.mailType,
        name: c.name,
        reasons: [v.tingkat === "tidak_cocok" ? `Asisten menilai tidak cocok: ${v.alasan}` : `Perlu dibaca staf: ${v.alasan}`],
      });
      continue;
    }
    const p = await proposeMailDecision({ villageId: args.villageId, userId: args.userId }, { requestId: c.id, decision: "approve" }, now);
    if (!p.ok) {
      manual.push({ requestId: c.id, requestNumber: c.requestNumber, mailType: c.mailType, name: c.name, reasons: [p.error] });
      continue;
    }
    proposals.push({ requestId: c.id, requestNumber: c.requestNumber, mailType: c.mailType, name: c.name, purpose: c.purpose, ageDays: c.ageDays, reason: v.alasan, card: p.card });
  }
  return { ok: true, proposals, manual, considered: items.length, charged: true };
}
