/**
 * Penerbitan surat pindah/datang → pengajuan mutasi PENDING di Buku Mutasi (lewat `submitMutation`, jadi
 * aturan validasi dan anti-ganda yang sama). TIDAK menerapkan apa pun ke data warga: operator memutuskan di Buku Mutasi.
 *
 * Dipanggil SESUDAH surat berhasil terbit. Kegagalan di sini tidak boleh membatalkan surat: semua galat
 * ditangkap dan dikembalikan sebagai alasan yang tampil di panel sukses.
 */
import type { Village } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { MUTATION_SUBMIT_ROLES } from "@/lib/kependudukan/mutation";
import { submitMutation } from "@/lib/kependudukan/mutation-service";
import { isKependudukanV2 } from "@/lib/kependudukan/sync";
import type { LetterValues } from "../values";
import type { LetterInput } from "./input";
import {
  mutationKindOfTemplate,
  planLetterMutations,
  type LetterMutationOutcome,
} from "../mutation-plan";

export type { LetterMutationOutcome } from "../mutation-plan";

type Submit = (a: Parameters<typeof submitMutation>[1]) => ReturnType<typeof submitMutation>;

/** `null` bila jenis surat ini tidak berkaitan dengan mutasi penduduk (respons tidak membawa info mutasi). */
export async function proposeLetterMutations(args: {
  village: Pick<Village, "id" | "settings">;
  userId: number;
  template: { catalogKey?: string | null; inheritsCatalogKey?: string | null };
  input: LetterInput;
  values: LetterValues;
  now?: Date;
  /** Hanya untuk tes. */
  submit?: Submit;
}): Promise<LetterMutationOutcome | null> {
  const kind = mutationKindOfTemplate(args.template);
  if (!kind) return null;
  const outcome: LetterMutationOutcome = { kind, created: [], skipped: [] };

  try {
    if (!isKependudukanV2(args.village.settings)) {
      outcome.skipped.push("Buku Mutasi belum aktif di desa ini, jadi pengajuan mutasi tidak dibuat.");
      return outcome;
    }
    const user = await prisma.user.findUnique({ where: { id: args.userId }, select: { role: true } });
    if (!user || !MUTATION_SUBMIT_ROLES.has(user.role)) {
      outcome.skipped.push("Peran Anda tidak dapat mengajukan mutasi. Minta admin atau sekretaris mencatatnya di Buku Mutasi.");
      return outcome;
    }

    const plan = planLetterMutations({ kind, input: args.input, values: args.values, now: args.now });
    outcome.skipped.push(...plan.skipped);

    const submit: Submit = args.submit ?? ((a) => submitMutation(prisma, a));
    for (const p of plan.proposals) {
      try {
        const r = await submit({ villageId: args.village.id, userId: args.userId, input: p.input, source: "letter", now: args.now });
        if (r.ok) outcome.created.push({ id: r.data.id, name: p.name });
        else if (r.status === 409) outcome.skipped.push(`${p.name}: sudah ada pengajuan yang sama dan masih menunggu keputusan di Buku Mutasi.`);
        else outcome.skipped.push(`${p.name}: ${r.errors[0] ?? "pengajuan ditolak."} Catat di Buku Mutasi.`);
      } catch (err) {
        logger.error({ err }, "letters: gagal mengajukan mutasi dari surat");
        outcome.skipped.push(`${p.name}: pengajuan otomatis gagal. Catat di Buku Mutasi.`);
      }
    }
  } catch (err) {
    logger.error({ err }, "letters: gagal menyiapkan mutasi dari surat");
    outcome.skipped.push("Pengajuan mutasi otomatis gagal. Surat tetap terbit; catat mutasinya di Buku Mutasi.");
  }
  return outcome;
}
