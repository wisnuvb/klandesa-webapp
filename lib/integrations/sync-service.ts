import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { exportApbdesSiskeudes } from "./adapters/apbdes-siskeudes";
import { exportProdeskel } from "./adapters/prodeskel";
import { exportResidentsKemendesa } from "./adapters/residents-kemendesa";
import { exportSdgsPortal } from "./adapters/sdgs-portal";
import { getAdapterMeta } from "./registry";
import type {
  IntegrationAdapterId,
  IntegrationExportFormat,
  IntegrationExportResult,
  IntegrationSyncResult,
} from "./types";

async function runExport(
  adapterId: IntegrationAdapterId,
  villageId: number,
  format: IntegrationExportFormat,
): Promise<IntegrationExportResult> {
  switch (adapterId) {
    case "residents_kemendesa":
      return exportResidentsKemendesa(villageId, format);
    case "apbdes_siskeudes":
      return exportApbdesSiskeudes(villageId, format);
    case "sdgs_portal":
      return exportSdgsPortal(villageId, format);
    case "prodeskel":
      return exportProdeskel(villageId, format);
    default:
      throw new Error(`Adapter tidak dikenal: ${adapterId}`);
  }
}

export async function runIntegrationExport(
  villageId: number,
  adapterId: string,
  format: IntegrationExportFormat = "csv",
): Promise<IntegrationExportResult> {
  const meta = getAdapterMeta(adapterId);
  if (!meta) throw new Error("Adapter tidak ditemukan");
  if (!meta.formats.includes(format)) {
    throw new Error(`Format ${format} tidak didukung untuk adapter ini`);
  }
  return runExport(adapterId as IntegrationAdapterId, villageId, format);
}

export async function runIntegrationSync(
  villageId: number,
  adapterId: string,
  format: IntegrationExportFormat = "json",
): Promise<{ exportResult: IntegrationExportResult; sync: IntegrationSyncResult }> {
  const meta = getAdapterMeta(adapterId);
  if (!meta) throw new Error("Adapter tidak ditemukan");

  const log = await prisma.integrationSyncLog.create({
    data: {
      villageId,
      adapterId,
      direction: meta.direction,
      status: "pending",
    },
  });

  try {
    const exportResult = await runIntegrationExport(villageId, adapterId, format);

    await prisma.integrationSyncLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        recordCount: exportResult.recordCount,
        payloadMeta: exportResult.meta as Prisma.InputJsonValue,
        finishedAt: new Date(),
      },
    });

    return {
      exportResult,
      sync: {
        logId: log.id,
        status: "success",
        recordCount: exportResult.recordCount,
        meta: exportResult.meta,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sinkronisasi gagal";
    await prisma.integrationSyncLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        errorMessage: message,
        finishedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function retryIntegrationSync(
  villageId: number,
  logId: number,
): Promise<{ exportResult: IntegrationExportResult; sync: IntegrationSyncResult }> {
  const prev = await prisma.integrationSyncLog.findFirst({
    where: { id: logId, villageId },
  });
  if (!prev) throw new Error("Log sinkronisasi tidak ditemukan");
  if (prev.status !== "failed") {
    throw new Error("Hanya log gagal yang bisa di-retry");
  }

  const format: IntegrationExportFormat =
    prev.adapterId === "sdgs_portal" ? "json" : "csv";

  return runIntegrationSync(villageId, prev.adapterId, format);
}
