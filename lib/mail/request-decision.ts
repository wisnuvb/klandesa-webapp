import { prisma } from "@/lib/prisma";
import { notifyMailRequestStatus } from "@/lib/mobile/notify";

/**
 * Keputusan staf web atas permohonan surat. Aturan sama dengan jalur staf mobile dan Laras (update bersyarat,
 * satu pemenang bila dua staf menekan bersamaan), dengan satu pengecualian yang disengaja: permohonan yang DITOLAK
 * Ketua RT boleh ditutup dengan penolakan (bila tidak, ia menggantung di antrean selamanya), tetapi tidak boleh disetujui.
 */

export const MIN_REJECT_NOTE = 5;
export const MAX_NOTE = 500;

export type DecisionResult =
  | { ok: true; requestNumber: string }
  | { ok: false; status: 400 | 404 | 409; error: string };

export function normalizeNote(raw: unknown): string {
  return typeof raw === "string" ? raw.replace(/\s+/g, " ").trim().slice(0, MAX_NOTE) : "";
}

export function validateDecision(decision: "approve" | "reject", note: string): string | null {
  if (decision === "reject" && note.length < MIN_REJECT_NOTE) {
    return `Tulis alasan penolakan (minimal ${MIN_REJECT_NOTE} huruf) agar warga tahu cara memperbaikinya.`;
  }
  return null;
}

export async function decideMailRequest(args: {
  villageId: number;
  id: bigint;
  decision: "approve" | "reject";
  note?: string;
  /** Surat yang diterbitkan untuk permohonan ini (jalur "terbitkan surat"). */
  mailServiceId?: bigint | null;
}): Promise<DecisionResult> {
  const note = normalizeNote(args.note);
  const invalid = validateDecision(args.decision, note);
  if (invalid) return { ok: false, status: 400, error: invalid };
  const approve = args.decision === "approve";

  const res = await prisma.mailRequest.updateMany({
    where: {
      id: args.id,
      villageId: args.villageId,
      status: "pending",
      ...(approve ? { OR: [{ rtStatus: null }, { rtStatus: "approved" }] } : {}),
    },
    data: {
      status: approve ? "approved" : "rejected",
      processedDate: new Date(),
      ...(approve ? { notes: note || null } : { rejectionReason: note }),
      ...(approve && args.mailServiceId != null ? { mailServiceId: args.mailServiceId } : {}),
    },
  });

  if (res.count !== 1) {
    const row = await prisma.mailRequest.findFirst({
      where: { id: args.id, villageId: args.villageId },
      select: { status: true, rtStatus: true },
    });
    if (!row) return { ok: false, status: 404, error: "Permohonan tidak ditemukan." };
    if (row.status !== "pending") return { ok: false, status: 409, error: "Permohonan ini sudah diproses oleh staf lain." };
    return {
      ok: false,
      status: 409,
      error: row.rtStatus === "pending" ? "Masih menunggu persetujuan Ketua RT." : "Ketua RT menolak pengantar ini; permohonan hanya bisa ditolak.",
    };
  }

  const row = await prisma.mailRequest.findUnique({ where: { id: args.id }, select: { requestNumber: true } });
  void notifyMailRequestStatus(args.id);
  return { ok: true, requestNumber: row?.requestNumber ?? args.id.toString() };
}

/**
 * Surat untuk permohonan ini baru saja diterbitkan: tautkan, dan setujui bila masih menunggu.
 * Tidak pernah gagal keras: surat sudah terbit, jadi galat di sini hanya dicatat. Mengembalikan true bila tertaut.
 */
export async function linkIssuedLetter(args: { villageId: number; requestId: bigint; letterId: bigint }): Promise<boolean> {
  try {
    const row = await prisma.mailRequest.findFirst({
      where: { id: args.requestId, villageId: args.villageId },
      select: { status: true, mailServiceId: true, nik: true },
    });
    if (!row || row.status === "rejected" || row.mailServiceId != null) return false;
    // Surat harus milik pemohon yang sama: mencegah menautkan (dan otomatis menyetujui) permohonan orang lain.
    const letter = await prisma.mailService.findFirst({
      where: { id: args.letterId, villageId: args.villageId, status: "completed" },
      select: { applicantNik: true },
    });
    if (!letter || letter.applicantNik !== row.nik) return false;
    if (row.status === "approved") {
      const r = await prisma.mailRequest.updateMany({
        where: { id: args.requestId, villageId: args.villageId, status: "approved", mailServiceId: null },
        data: { mailServiceId: args.letterId },
      });
      return r.count === 1;
    }
    const d = await decideMailRequest({
      villageId: args.villageId,
      id: args.requestId,
      decision: "approve",
      note: "Surat telah diterbitkan.",
      mailServiceId: args.letterId,
    });
    return d.ok;
  } catch (e) {
    console.error("linkIssuedLetter failed", e);
    return false;
  }
}

/** `permohonanId` dari body pembuatan/ubah surat; null bila tak ada atau bukan bilangan bulat positif. */
export function permohonanIdFrom(body: unknown): bigint | null {
  const raw = body && typeof body === "object" ? (body as { permohonanId?: unknown }).permohonanId : undefined;
  const s = typeof raw === "number" ? String(raw) : typeof raw === "string" ? raw : "";
  return /^\d{1,18}$/.test(s) && BigInt(s) > 0n ? BigInt(s) : null;
}
