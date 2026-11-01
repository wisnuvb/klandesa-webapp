import { cleanText, isRecord, type Parsed } from "@/lib/form-input";
import { LIMITS, isAction, type OrderAction } from "./catalog";

const bad = (fe: Record<string, string>) => ({ ok: false as const, errors: Object.values(fe), fieldErrors: fe });

export interface OrderInput {
  quantity: number;
  note: string | null;
}

/** Jumlah: bilangan bulat 1-999 dari angka atau teks digit saja. Catatan opsional maksimal 300 karakter. */
export function parseOrderInput(body: unknown): Parsed<OrderInput> {
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const fe: Record<string, string> = {};
  const raw = body.quantity === undefined || body.quantity === null || body.quantity === "" ? 1 : body.quantity;
  const n = typeof raw === "number" ? raw : typeof raw === "string" && /^\d{1,4}$/.test(raw.trim()) ? Number(raw.trim()) : NaN;
  if (!Number.isInteger(n) || n < 1 || n > LIMITS.maxQuantity) fe.quantity = `Jumlah harus bilangan bulat 1 sampai ${LIMITS.maxQuantity}.`;
  const note = cleanText(body.note, LIMITS.noteMax);
  if (note.bad || note.tooLong) fe.note = `Catatan maksimal ${LIMITS.noteMax} karakter.`;
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { quantity: n, note: note.value } };
}

export interface ActionInput {
  action: OrderAction;
  note: string | null;
}

export function parseActionInput(body: unknown): Parsed<ActionInput> {
  if (!isRecord(body)) return { ok: false, errors: ["Data tidak valid."], fieldErrors: {} };
  const fe: Record<string, string> = {};
  if (!isAction(body.action)) fe.action = "Aksi tidak dikenal.";
  const note = cleanText(body.note, LIMITS.noteMax);
  if (note.bad || note.tooLong) fe.note = `Catatan maksimal ${LIMITS.noteMax} karakter.`;
  if (Object.keys(fe).length) return bad(fe);
  return { ok: true, value: { action: body.action as OrderAction, note: note.value } };
}
