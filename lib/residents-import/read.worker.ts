/** Web Worker: parsing file Excel besar tidak membekukan tab. Dibundel lewat `new Worker(new URL(...))`. */
import type { ColumnMapping } from "./batch";
import type { PlannedSheet } from "./plan";
import { readAndPlan } from "./read-plan";

export interface ReadRequest {
  buf: ArrayBuffer;
  saved: Record<string, ColumnMapping>;
}
export type ReadResponse = { ok: true; plans: PlannedSheet[] } | { ok: false; error: string };

const ctx = self as unknown as {
  onmessage: ((e: MessageEvent<ReadRequest>) => void) | null;
  postMessage: (msg: ReadResponse) => void;
};

ctx.onmessage = (e) => {
  try {
    ctx.postMessage({ ok: true, plans: readAndPlan(e.data.buf, e.data.saved) });
  } catch (err) {
    ctx.postMessage({ ok: false, error: err instanceof Error ? err.message : String(err) });
  }
};
