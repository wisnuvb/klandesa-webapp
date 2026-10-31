/**
 * Batasi riwayat percakapan yang dikirim ke model: biaya tiap panggilan naik seiring panjang riwayat, dan satu
 * pertanyaan bisa memicu beberapa panggilan. Pesan terbaru diutamakan; pesan yang terlalu panjang dipotong.
 */
export const HISTORY_MAX_CHARS = 16_000;
export const HISTORY_MESSAGE_MAX_CHARS = 4_000;

export type HistoryMessage = { role: "user" | "assistant"; content: string };

export function trimHistoryForAi(
  history: HistoryMessage[],
  maxChars = HISTORY_MAX_CHARS,
  perMessage = HISTORY_MESSAGE_MAX_CHARS,
): HistoryMessage[] {
  const kept: HistoryMessage[] = [];
  let used = 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i]!;
    const content = m.content.length > perMessage ? `${m.content.slice(0, perMessage)}…` : m.content;
    if (used + content.length > maxChars) break;
    used += content.length;
    kept.push({ role: m.role, content });
  }
  kept.reverse();
  // Mulai dari pesan pengguna agar alur percakapan wajar bagi model.
  while (kept.length > 0 && kept[0]!.role !== "user") kept.shift();
  return kept;
}
