import { Prisma, type PrismaClient } from "@prisma/client";
import { escapeHtml } from "@/lib/html-escape";
import { isVillageSubscriptionReadable } from "@/lib/subscription";
import { REMINDER_STAGES, reminderKey, reminderStage, stageLabel, wibToday, type Iso, type ReminderStage } from "./calc";
import { EMPTY_FACTS, evaluateVillage } from "./evaluate";
import { loadEntries, loadFacts, loadScopes, lookupKeys } from "./service";

export const NOTIFICATION_TYPE = "compliance_reminder";
const BATCH = 200;
const MAX_VILLAGES = 20_000;
const MAX_CLAIMS_PER_RUN = 5_000;
const MAX_RECIPIENTS = 5;
const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const dateId = (iso: Iso): string => {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return `${d} ${MONTHS[m - 1]} ${y}`;
};

export interface ReminderCandidate {
  villageId: number;
  year: number;
  itemKey: string;
  title: string;
  due: Iso;
  daysLeft: number;
  stage: ReminderStage;
  sourceKey: string;
}

export interface ReminderDeps {
  /** Kirim email; tidak diberikan = tanpa email. */
  sendEmail?: (m: { to: string; subject: string; html: string; text: string }) => Promise<{ ok: boolean }>;
  /** Notifikasi mobile ke staf desa (kotak masuk + push). Tidak diberikan = dilewati. */
  notifyStaff?: (villageId: number, n: { title: string; body: string; deepLink: string }) => Promise<void>;
}

export interface ReminderStats {
  villages: number;
  candidates: number;
  claimed: number;
  skippedAlreadySent: number;
  emailSent: number;
  emailFailed: number;
  noRecipient: number;
  capped: boolean;
}

export function buildMessage(c: Pick<ReminderCandidate, "title" | "due" | "daysLeft" | "stage" | "year">): { title: string; body: string } {
  const when = stageLabel(c.stage, c.daysLeft);
  return {
    title: `Tenggat laporan ${when}: ${c.title}`.slice(0, 250),
    body: `Tenggat ${dateId(c.due)} (tahun anggaran ${c.year}). Statusnya belum terkirim. Buka Kalender Kepatuhan untuk melihat bahan cetak dan mencatat bukti kirim.`,
  };
}

/** Admin/kepala desa aktif plus surel desa; unik dan dibatasi agar satu desa tidak memicu banyak surel. */
async function recipientsFor(db: PrismaClient, villageId: number, villageEmail: string | null): Promise<string[]> {
  const users = await db.user.findMany({ where: { villageId, isActive: true, role: { in: ["admin", "village_head"] } }, select: { email: true }, take: 10 });
  const set = new Set<string>();
  for (const e of [...users.map((u) => u.email), villageEmail]) {
    const v = (e ?? "").trim().toLowerCase();
    if (v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) set.add(v);
  }
  return [...set].slice(0, MAX_RECIPIENTS);
}

/** Daftar pengingat yang berlaku hari ini untuk sekumpulan desa (tanpa menulis apa pun). */
export async function planForVillages(db: PrismaClient, villageIds: number[], today: Iso): Promise<ReminderCandidate[]> {
  const y = Number(today.slice(0, 4));
  const years = [y - 1, y, y + 1];
  const scopes = await loadScopes(db, villageIds);
  const entries = await loadEntries(db, lookupKeys(scopes.values()));
  const facts = await loadFacts(db, villageIds, years);
  const out: ReminderCandidate[] = [];
  for (const id of villageIds) {
    const sc = scopes.get(id);
    if (!sc) continue;
    for (const year of years) {
      const rows = evaluateVillage({ year, today, scope: sc, entries, facts: facts.get(`${id}:${year}`) ?? EMPTY_FACTS });
      for (const r of rows) {
        if (!r.binding || r.due === null || r.daysLeft === null || r.status === "TERKIRIM") continue;
        const stage = reminderStage(r.daysLeft);
        if (!stage) continue;
        out.push({ villageId: id, year, itemKey: r.key, title: r.title, due: r.due, daysLeft: r.daysLeft, stage, sourceKey: reminderKey(r.key, year, stage) });
      }
    }
  }
  return out;
}

/**
 * Menjalankan pengingat harian. Idempoten: setiap (desa, butir, tahun, tahap) memiliki satu baris AdminNotification dengan
 * sourceKey unik; klaim dibuat SEBELUM mengirim apa pun, sehingga proses ulang atau dua proses serentak tidak mengirim ganda.
 * Konsekuensinya pengiriman bersifat paling banyak satu kali: bila proses mati tepat setelah klaim, satu pengingat hilang,
 * bukan terkirim dua kali. Kegagalan email tidak membuka klaim (agar notifikasi mobile tidak terulang).
 */
export async function runReminders(db: PrismaClient, args: { now?: Date; today?: Iso; deps?: ReminderDeps; onlyVillageIds?: number[] }): Promise<ReminderStats> {
  const now = args.now ?? new Date();
  const today = args.today ?? wibToday(now);
  const deps = args.deps ?? {};
  const stats: ReminderStats = { villages: 0, candidates: 0, claimed: 0, skippedAlreadySent: 0, emailSent: 0, emailFailed: 0, noRecipient: 0, capped: false };
  let cursor = 0;
  let scanned = 0;
  for (;;) {
    const villages = await db.village.findMany({
      where: { isActive: true, id: { gt: cursor }, ...(args.onlyVillageIds ? { id: { in: args.onlyVillageIds, gt: cursor } } : {}) },
      orderBy: { id: "asc" },
      take: BATCH,
      select: { id: true, name: true, email: true, subscriptionStatus: true, subscriptionExpiry: true },
    });
    if (!villages.length) break;
    cursor = villages[villages.length - 1]!.id;
    scanned += villages.length;
    const live = villages.filter((v) => isVillageSubscriptionReadable(v, now.getTime()));
    stats.villages += live.length;
    const cands = await planForVillages(db, live.map((v) => v.id), today);
    stats.candidates += cands.length;
    const byId = new Map(live.map((v) => [v.id, v]));
    const recCache = new Map<number, string[]>();
    for (const c of cands) {
      if (stats.claimed >= MAX_CLAIMS_PER_RUN) {
        stats.capped = true;
        return stats;
      }
      const msg = buildMessage(c);
      const href = `/kepatuhan?year=${c.year}`;
      try {
        await db.adminNotification.create({ data: { villageId: c.villageId, type: NOTIFICATION_TYPE, sourceKey: c.sourceKey, title: msg.title, body: msg.body, href } });
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          stats.skippedAlreadySent += 1;
          continue;
        }
        throw e;
      }
      stats.claimed += 1;
      if (deps.notifyStaff) await deps.notifyStaff(c.villageId, { title: msg.title, body: msg.body, deepLink: href }).catch((e) => console.error("[kepatuhan-reminders] notifikasi mobile gagal:", e));
      if (deps.sendEmail) {
        let to = recCache.get(c.villageId);
        if (!to) {
          to = await recipientsFor(db, c.villageId, byId.get(c.villageId)?.email ?? null);
          recCache.set(c.villageId, to);
        }
        if (!to.length) stats.noRecipient += 1;
        else {
          const html = `<p>${escapeHtml(msg.body)}</p><p><strong>${escapeHtml(c.title)}</strong></p>`;
          let delivered = 0;
          for (const addr of to) {
            const res = await deps.sendEmail({ to: addr, subject: msg.title, html, text: `${msg.title}\n\n${msg.body}` }).catch(() => ({ ok: false }));
            if (res.ok) delivered += 1;
          }
          if (delivered > 0) stats.emailSent += 1;
          else stats.emailFailed += 1;
        }
      }
    }
    if (scanned >= MAX_VILLAGES) break;
  }
  return stats;
}

export const STAGES = REMINDER_STAGES;
