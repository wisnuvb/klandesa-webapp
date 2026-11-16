"use client";

/**
 * Persetujuan cookie pemasaran (Meta Pixel). Disimpan di localStorage selama 1 tahun.
 * Sebelum "granted": skrip Meta tidak diunduh dan tidak ada event yang dikirim.
 */
const KEY = "klandesa.consent.v1";
const MAX_AGE_MS = 365 * 24 * 60 * 60 * 1000;
const CHANGE_EVENT = "klandesa:consent-change";
const OPEN_EVENT = "klandesa:consent-open";

export type ConsentChoice = "granted" | "denied";
/** `loading` = belum diketahui (SSR / render pertama), `unset` = pengunjung belum memilih. */
export type ConsentState = ConsentChoice | "unset" | "loading";

export function readConsent(now = Date.now()): ConsentChoice | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { choice?: unknown; at?: unknown };
    if (parsed.choice !== "granted" && parsed.choice !== "denied") return null;
    if (typeof parsed.at !== "number" || now - parsed.at > MAX_AGE_MS) return null;
    return parsed.choice;
  } catch {
    return null;
  }
}

export function writeConsent(choice: ConsentChoice): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ choice, at: Date.now() }));
  } catch {
    // localStorage diblokir: pilihan berlaku untuk sesi ini saja.
    memoryChoice = choice;
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

let memoryChoice: ConsentChoice | null = null;

function snapshot(): ConsentState {
  return readConsent() ?? memoryChoice ?? "unset";
}

export function subscribeConsent(onChange: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export const consentSnapshot = snapshot;
export const consentServerSnapshot = (): ConsentState => "loading";

/** Buka kembali banner (tautan "Pengaturan cookie" di footer). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function subscribeConsentOpen(onOpen: () => void): () => void {
  window.addEventListener(OPEN_EVENT, onOpen);
  return () => window.removeEventListener(OPEN_EVENT, onOpen);
}
