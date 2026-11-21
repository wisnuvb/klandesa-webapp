/**
 * Pemberitahuan Aspirasi Warga. Semuanya BEST-EFFORT: tidak pernah melempar dan tidak pernah menggagalkan aksi utama
 * (panggil dengan `void`). Email lewat sendTransactional sehingga ikut anggaran kuota harian. Isi email TIDAK memuat
 * kontak pelapor; pemilik membuka konsol admin untuk melihatnya.
 */
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { sendTransactional } from "@/lib/email/send";
import { escapeHtml, renderEmail } from "@/lib/email/render";
import { getAppOrigin } from "@/lib/email/app-origin";
import { checkRateLimitDb, limiterKey } from "@/lib/mobile/rate-limit";
import { ownerRecipients } from "@/lib/notifications/owner-notify";
import { categoryLabel, FLAG_REASON_LABELS, type FlagReason } from "./catalog";
import { tidyText } from "./text";

type Rows = Array<[string, string]>;
const oneLine = (s: string, max: number) => {
  const t = tidyText(s).replace(/\s+/g, " ");
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

function ownerContent(subject: string, headline: string, rows: Rows) {
  const text = [headline, "", ...rows.map(([k, v]) => `${k}: ${v}`)].join("\n");
  const html =
    `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111827;max-width:560px">` +
    `<h2 style="font-size:18px;margin:0 0 12px">${escapeHtml(headline)}</h2><table style="border-collapse:collapse;width:100%">` +
    rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`).join("") +
    `</table></div>`;
  return { subject, html, text };
}

export type OwnerAspirasiEvent =
  | { kind: "queued"; code: string; title: string; category: string; area: string; manualArea: boolean }
  | { kind: "claim"; area: string; village: string; position: string }
  | { kind: "flag"; code: string; title: string; reason: FlagReason; source: "PUBLIC" | "VILLAGE"; hidden: boolean };

export function buildOwnerAspirasiEmail(e: OwnerAspirasiEvent) {
  const url = `${getAppOrigin()}/admin/aspirasi`;
  if (e.kind === "queued") {
    return ownerContent(`[Klandesa] Aspirasi baru menunggu tinjauan: ${oneLine(e.area, 40)}`, "Ada laporan aspirasi warga baru yang menunggu tinjauan sebelum tayang.", [
      ["Desa", e.area + (e.manualArea ? " (wilayah diketik manual, periksa namanya)" : "")],
      ["Kategori", categoryLabel(e.category)],
      ["Judul", oneLine(e.title, 160)],
      ["Nomor", e.code],
      ["Tinjau", url],
    ]);
  }
  if (e.kind === "claim") {
    return ownerContent(`[Klandesa] Permohonan klaim halaman desa: ${oneLine(e.area, 40)}`, "Sebuah desa terdaftar meminta mengelola halaman aspirasi wilayahnya.", [
      ["Wilayah yang diklaim", e.area],
      ["Desa pemohon", e.village],
      ["Jabatan pemohon", oneLine(e.position, 120)],
      ["Verifikasi", url],
    ]);
  }
  return ownerContent(
    `[Klandesa] Laporan konten aspirasi${e.hidden ? " (disembunyikan otomatis)" : ""}`,
    e.hidden ? "Sebuah aspirasi disembunyikan otomatis dan perlu ditinjau." : "Ada laporan konten untuk sebuah aspirasi yang sudah tayang.",
    [
      ["Alasan", FLAG_REASON_LABELS[e.reason]],
      ["Dari", e.source === "VILLAGE" ? "Desa yang mengelola halaman" : "Publik"],
      ["Aspirasi", `${oneLine(e.title, 120)} (${e.code})`],
      ["Tinjau", url],
    ],
  );
}

export async function notifyOwnerAspirasi(e: OwnerAspirasiEvent): Promise<void> {
  try {
    const rl = await checkRateLimitDb(limiterKey("owner-notify-aspirasi", "all"), { max: 30, windowMs: 60 * 60_000 });
    if (!rl.ok) return;
    const content = buildOwnerAspirasiEmail(e);
    for (const to of ownerRecipients()) {
      const res = await sendTransactional({ template: "owner-notify", to, content });
      if (!res.ok && res.reason !== "not-configured") logger.warn({ event: `aspirasi-${e.kind}`, reason: res.reason }, "[aspirasi] email pemilik tidak terkirim");
    }
  } catch (err) {
    logger.warn({ event: `aspirasi-${e.kind}`, err: err instanceof Error ? err.message : String(err) }, "[aspirasi] gagal menyiapkan email pemilik");
  }
}

export function buildClaimDecisionEmail(i: { decision: "APPROVED" | "REJECTED" | "REVOKED"; areaName: string; note: string | null }) {
  const origin = getAppOrigin();
  if (i.decision === "APPROVED") {
    return renderEmail({
      subject: `Klaim halaman aspirasi ${oneLine(i.areaName, 50)} disetujui`,
      title: "Klaim halaman aspirasi desa Anda disetujui",
      paragraphs: [
        `Desa Anda kini mengelola halaman aspirasi warga untuk ${i.areaName}. Aspirasi yang sudah tayang dapat ditanggapi dari menu Aspirasi Publik di dasbor Klandesa.`,
      ],
      cta: { label: "Buka Aspirasi Publik", url: `${origin}/aspirasi-publik` },
    });
  }
  return renderEmail({
    subject: `Klaim halaman aspirasi ${oneLine(i.areaName, 50)} ${i.decision === "REVOKED" ? "dicabut" : "belum dapat disetujui"}`,
    title: i.decision === "REVOKED" ? "Klaim halaman aspirasi dicabut" : "Klaim halaman aspirasi belum dapat disetujui",
    paragraphs: [
      `Permohonan Anda untuk mengelola halaman aspirasi ${i.areaName} ${i.decision === "REVOKED" ? "dicabut" : "belum dapat kami setujui"}.`,
      ...(i.note ? [`Alasan: ${i.note}`] : []),
      "Anda dapat mengajukan klaim lagi dengan bukti yang lebih lengkap, atau membalas email ini bila ada pertanyaan.",
    ],
  });
}

export async function notifyClaimDecision(i: { to: string | null; decision: "APPROVED" | "REJECTED" | "REVOKED"; areaName: string; note: string | null }): Promise<void> {
  try {
    if (!i.to) return;
    await sendTransactional({ template: "aspirasi", to: i.to, content: buildClaimDecisionEmail(i), source: "admin", dedupeMs: 60_000 });
  } catch (err) {
    logger.warn({ event: "aspirasi-claim-decision", err: err instanceof Error ? err.message : String(err) }, "[aspirasi] email keputusan klaim gagal");
  }
}

/** Lonceng dasbor desa: ada aspirasi baru yang tayang di wilayah yang mereka kelola. Idempoten per laporan. */
export async function notifyVillageNewAspiration(villageId: number, a: { code: string; title: string; category: string }): Promise<void> {
  try {
    await prisma.adminNotification.upsert({
      where: { villageId_sourceKey: { villageId, sourceKey: `aspirasi-${a.code}` } },
      create: {
        villageId,
        type: "aspiration_new",
        sourceKey: `aspirasi-${a.code}`,
        title: "Aspirasi warga baru di wilayah Anda",
        body: `${categoryLabel(a.category)}: ${oneLine(a.title, 120)}`,
        href: "/aspirasi-publik",
      },
      update: {},
    });
  } catch (err) {
    logger.warn({ event: "aspirasi-village-notify", err: err instanceof Error ? err.message : String(err) }, "[aspirasi] notifikasi desa gagal");
  }
}

/** Setelah klaim disetujui: satu notifikasi ringkas untuk aspirasi yang sudah menunggu tanggapan. */
export async function notifyVillageBacklog(villageId: number, areaId: number): Promise<void> {
  try {
    const n = await prisma.aspiration.count({ where: { areaId, status: "PUBLISHED", progress: "NEW" } });
    if (n === 0) return;
    await prisma.adminNotification.upsert({
      where: { villageId_sourceKey: { villageId, sourceKey: `aspirasi-backlog-${areaId}` } },
      create: { villageId, type: "aspiration_new", sourceKey: `aspirasi-backlog-${areaId}`, title: "Aspirasi warga menunggu tanggapan Anda", body: `${n} laporan warga di wilayah Anda belum ditanggapi.`, href: "/aspirasi-publik" },
      update: {},
    });
  } catch (err) {
    logger.warn({ event: "aspirasi-village-backlog", err: err instanceof Error ? err.message : String(err) }, "[aspirasi] notifikasi tunggakan gagal");
  }
}
