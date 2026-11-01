/** Istilah polling. Murni (tanpa Prisma) supaya aman dipakai di komponen klien. */
export type PollStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED";
export const STATUS_LABEL: Record<PollStatus, string> = { DRAFT: "Draf", SCHEDULED: "Terjadwal", OPEN: "Sedang berlangsung", CLOSED: "Ditutup" };
