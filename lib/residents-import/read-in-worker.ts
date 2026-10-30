import type { ColumnMapping } from "./batch";
import type { PlannedSheet } from "./plan";
import { readAndPlan } from "./read-plan";
import type { ReadResponse } from "./read.worker";

/**
 * Baca file di Web Worker agar UI tetap responsif. Bila Worker tidak tersedia atau gagal dimuat,
 * jatuh ke thread utama (lebih lambat, tetapi tetap berfungsi).
 */
export function readPlanInWorker(buf: ArrayBuffer, saved: Record<string, ColumnMapping>): Promise<PlannedSheet[]> {
  return new Promise((resolve, reject) => {
    const fallback = () => {
      try {
        resolve(readAndPlan(buf, saved));
      } catch (e) {
        reject(e);
      }
    };
    if (typeof Worker === "undefined") return fallback();

    let worker: Worker;
    try {
      worker = new Worker(new URL("./read.worker.ts", import.meta.url), { type: "module" });
    } catch {
      return fallback();
    }
    worker.onmessage = (e: MessageEvent<ReadResponse>) => {
      worker.terminate();
      if (e.data.ok) resolve(e.data.plans);
      else reject(new Error(e.data.error));
    };
    // Worker gagal dimuat (bukan galat parsing) → cadangan di thread utama
    worker.onerror = () => {
      worker.terminate();
      fallback();
    };
    worker.postMessage({ buf, saved });
  });
}
