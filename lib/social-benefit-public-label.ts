import type { SocialBenefitEnrollmentStatus } from "@prisma/client";

/** Label singkat tingkat tinggi untuk tampilan warga (tanpa nominal). */
const STATUS_FALLBACK_LABEL: Record<SocialBenefitEnrollmentStatus, string> = {
  registered: "Tercatat dalam program",
  under_review: "Sedang diproses administrasi",
  approved: "Sesuai verifikasi desa untuk tahap penyaluran",
  active: "Partisipasi program berlangsung",
  completed: "Program untuk periode tersebut telah dilaksanakan/ditutup pada catatan desa",
  withdrawn: "Pencabutan atau tidak lagi mengikuti periode tersebut pada catatan desa",
};

export function resolvePublicEnrollmentSummary(opts: {
  status: SocialBenefitEnrollmentStatus;
  publicNote: string | null;
}): string {
  const trimmed = opts.publicNote?.trim();
  if (trimmed) return trimmed.slice(0, 240);
  return STATUS_FALLBACK_LABEL[opts.status];
}
