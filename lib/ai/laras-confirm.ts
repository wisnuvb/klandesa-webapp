import type { PermissionAction } from "@/lib/permissions/actions";
import type { PermissionResource } from "@/lib/permissions/resources";
import {
  verifyAction,
  type ActionPayload,
  type ActionType,
  type AnnouncementPublishPayload,
  type MailDecisionPayload,
  type ReportActionPayload,
} from "@/lib/ai/laras-actions";

/** Izin dan modul yang dibutuhkan per jenis aksi; dicek saat konfirmasi memakai role segar dari DB. */
export const REQUIREMENTS: Record<
  ActionType,
  { resource: PermissionResource; action: PermissionAction; moduleId: string; moduleLabel: string; what: string }
> = {
  mail_decision: { resource: "mail", action: "update", moduleId: "layanan-surat", moduleLabel: "Layanan Surat", what: "memproses permohonan surat" },
  report_action: { resource: "citizen_reports", action: "update", moduleId: "pengaduan-masyarakat", moduleLabel: "Pengaduan Masyarakat", what: "menindaklanjuti pengaduan warga" },
  announcement_publish: { resource: "announcements", action: "create", moduleId: "pengumuman-desa", moduleLabel: "Pengumuman Desa", what: "menerbitkan pengumuman" },
};

export const MAX_TOKENS_PER_CALL = 20;

export type ItemResult = { ok: boolean; error?: string };
type Exec = { ok: true } | { ok: false; error: string };

export type ConfirmDeps = {
  verify?: typeof verifyAction;
  /** Izin pengguna berdasarkan role segar dari DB. */
  can: (resource: PermissionResource, action: PermissionAction) => boolean;
  entitled: (moduleId: string) => Promise<boolean>;
  /** Token sekali pakai: false bila sudah pernah dipakai. */
  consume: (token: string) => Promise<boolean>;
  release: (token: string) => Promise<void>;
  executeMail: (p: MailDecisionPayload) => Promise<Exec>;
  executeReport: (p: ReportActionPayload) => Promise<Exec>;
  executeAnnouncement: (p: AnnouncementPublishPayload) => Promise<Exec>;
};

/**
 * Inti konfirmasi usulan: setiap token diproses terpisah dan galat satu token tidak menggagalkan token lain atau
 * membuat hasil sebelumnya hilang.
 */
export async function confirmActions(
  params: { tokens: unknown[]; userId: number; villageId: number },
  deps: ConfirmDeps,
): Promise<ItemResult[]> {
  const verify = deps.verify ?? verifyAction;
  const results: ItemResult[] = [];

  for (const token of params.tokens) {
    try {
      const v = verify(token);
      if (!v.ok) {
        results.push({
          ok: false,
          error: v.reason === "expired" ? "Usulan sudah kedaluwarsa. Minta Laras menyusun ulang." : "Usulan tidak valid.",
        });
        continue;
      }
      const p: ActionPayload = v.payload;
      if (p.u !== params.userId || p.vi !== params.villageId) {
        results.push({ ok: false, error: "Usulan ini bukan untuk akun Anda." });
        continue;
      }

      const need = REQUIREMENTS[p.t];
      if (!deps.can(need.resource, need.action)) {
        results.push({ ok: false, error: `Anda tidak memiliki izin untuk ${need.what}.` });
        continue;
      }
      if (!(await deps.entitled(need.moduleId))) {
        results.push({ ok: false, error: `Modul ${need.moduleLabel} belum aktif di desa ini.` });
        continue;
      }

      if (!(await deps.consume(token as string))) {
        results.push({ ok: false, error: "Usulan ini sudah diproses. Minta Laras menyusun ulang bila perlu." });
        continue;
      }

      let r: Exec;
      try {
        r = p.t === "mail_decision" ? await deps.executeMail(p) : p.t === "report_action" ? await deps.executeReport(p) : await deps.executeAnnouncement(p);
      } catch (e) {
        // Tidak sempat dieksekusi: kembalikan token supaya "Coba lagi" bisa berhasil.
        console.error("laras confirm execute failed", e);
        await deps.release(token as string);
        results.push({ ok: false, error: "Gagal memproses. Coba lagi." });
        continue;
      }
      results.push(r.ok ? { ok: true } : { ok: false, error: r.error });
    } catch (e) {
      console.error("laras confirm item failed", e);
      results.push({ ok: false, error: "Gagal memproses. Coba lagi." });
    }
  }
  return results;
}
