import { Platform } from 'react-native';

import { resolveApiBase } from './api-base';
import { APP_VERSION } from './app-config';
import { createCrashGate, errorParts } from './crash-logic';

const gate = createCrashGate(5);
let currentScreen: string | null = null;

/** Dipanggil dari root layout supaya laporan memuat layar terakhir yang dibuka. */
export function setCrashScreen(path: string | null) {
  currentScreen = path;
}

/** Kirim laporan crash tanpa menunggu dan tanpa pernah melempar error baru. Tidak menyertakan akun atau token. */
export function reportCrash(error: unknown, fatal = false): void {
  try {
    const { message, stack } = errorParts(error);
    if (!gate(message)) return;
    const base = resolveApiBase();
    if (!base) return;
    void fetch(`${base}/api/mobile/v1/telemetry/crash`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, stack, fatal, screen: currentScreen, appVersion: APP_VERSION, platform: Platform.OS, osVersion: String(Platform.Version) }),
    }).catch(() => undefined);
  } catch {
    /* pelaporan tidak boleh menimbulkan masalah baru */
  }
}

type GlobalErrorUtils = { getGlobalHandler: () => (e: unknown, fatal?: boolean) => void; setGlobalHandler: (h: (e: unknown, fatal?: boolean) => void) => void };

/** Pasang sekali: error JS yang tidak tertangkap dilaporkan, lalu diteruskan ke penanganan bawaan. */
export function installCrashReporting(): void {
  const eu = (globalThis as unknown as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
  if (!eu) return;
  const prev = eu.getGlobalHandler();
  eu.setGlobalHandler((e, fatal) => {
    reportCrash(e, fatal === true);
    prev(e, fatal);
  });
}
