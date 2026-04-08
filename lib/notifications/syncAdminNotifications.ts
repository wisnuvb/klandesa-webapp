import { prisma } from "@/lib/prisma";

const TYPE_MAIL = "mail_request_pending";
const TYPE_FINANCE = "finance_transaction";
const TYPE_RESIDENT = "resident_update";

/**
 * Sinkronkan baris AdminNotification dengan data terkini (permohonan pending,
 * transaksi & pembaruan warga terbaru). Aman dipanggil berulang (idempotent per sourceKey).
 */
export async function syncAdminNotificationsForVillage(villageId: number): Promise<void> {
  await syncMailRequests(villageId);
  await syncFinance(villageId);
  await syncResidents(villageId);
}

async function syncMailRequests(villageId: number) {
  const pending = await prisma.mailRequest.findMany({
    where: { villageId, status: "pending" },
    orderBy: { requestDate: "desc" },
  });

  const validKeys = pending.map((r) => `mail-req-${r.id}`);

  if (validKeys.length === 0) {
    await prisma.adminNotification.deleteMany({
      where: { villageId, type: TYPE_MAIL },
    });
    return;
  }

  await prisma.adminNotification.deleteMany({
    where: {
      villageId,
      type: TYPE_MAIL,
      sourceKey: { notIn: validKeys },
    },
  });

  for (const r of pending) {
    const sourceKey = `mail-req-${r.id}`;
    await prisma.adminNotification.upsert({
      where: {
        villageId_sourceKey: { villageId, sourceKey },
      },
      create: {
        villageId,
        type: TYPE_MAIL,
        sourceKey,
        title: "Permohonan surat baru",
        body: `${r.name} mengajukan ${r.mailType}`,
        href: "/permohonan-warga",
        createdAt: r.requestDate,
      },
      update: {
        title: "Permohonan surat baru",
        body: `${r.name} mengajukan ${r.mailType}`,
        href: "/permohonan-warga",
      },
    });
  }
}

async function syncFinance(villageId: number) {
  const txs = await prisma.transaction.findMany({
    where: { villageId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const validKeys = txs.map((t) => `tx-${t.id}`);

  if (validKeys.length === 0) {
    await prisma.adminNotification.deleteMany({
      where: { villageId, type: TYPE_FINANCE },
    });
    return;
  }

  await prisma.adminNotification.deleteMany({
    where: {
      villageId,
      type: TYPE_FINANCE,
      sourceKey: { notIn: validKeys },
    },
  });

  for (const t of txs) {
    const sourceKey = `tx-${t.id}`;
    const isIncome = t.type === "income";
    const title = isIncome ? "Pemasukan keuangan" : "Pengeluaran keuangan";
    const body = `${t.category}${t.description ? ` — ${t.description.slice(0, 120)}${t.description.length > 120 ? "…" : ""}` : ""}`;

    await prisma.adminNotification.upsert({
      where: {
        villageId_sourceKey: { villageId, sourceKey },
      },
      create: {
        villageId,
        type: TYPE_FINANCE,
        sourceKey,
        title,
        body,
        href: "/keuangan",
        createdAt: t.createdAt,
      },
      update: {
        title,
        body,
        href: "/keuangan",
      },
    });
  }
}

async function syncResidents(villageId: number) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

  const candidates = await prisma.resident.findMany({
    where: {
      villageId,
      updatedAt: { gte: since },
    },
    orderBy: { updatedAt: "desc" },
    take: 25,
  });

  const updated = candidates
    .filter((r) => r.updatedAt.getTime() !== r.createdAt.getTime())
    .slice(0, 5);

  const validKeys = updated.map((r) => `resident-${r.id}`);

  if (validKeys.length === 0) {
    await prisma.adminNotification.deleteMany({
      where: { villageId, type: TYPE_RESIDENT },
    });
    return;
  }

  await prisma.adminNotification.deleteMany({
    where: {
      villageId,
      type: TYPE_RESIDENT,
      sourceKey: { notIn: validKeys },
    },
  });

  for (const r of updated) {
    const sourceKey = `resident-${r.id}`;
    await prisma.adminNotification.upsert({
      where: {
        villageId_sourceKey: { villageId, sourceKey },
      },
      create: {
        villageId,
        type: TYPE_RESIDENT,
        sourceKey,
        title: "Data warga diperbarui",
        body: `${r.name} — NIK ${r.nik}`,
        href: "/data-warga",
        createdAt: r.updatedAt,
      },
      update: {
        title: "Data warga diperbarui",
        body: `${r.name} — NIK ${r.nik}`,
        href: "/data-warga",
      },
    });
  }
}
