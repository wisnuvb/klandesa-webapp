import type { ActionCard } from "@/lib/ai/laras-actions";

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Usulan aksi Laras dari jawaban langsung (tidak dimuat ulang dari riwayat). */
  actions?: ActionCard[];
};

export type ThreadSummary = {
  id: number;
  mode: string;
  modeLabel: string;
  title: string;
  messageCount: number;
  updatedAt: string;
};

/**
 * Mode yang diterima server. Percakapan baru di web memakai "general"; sisanya tetap valid untuk
 * riwayat lama dan tautan dalam yang membawa `?mode=`.
 */
export const KNOWN_MODES = [
  "general",
  "citizen_faq",
  "sdgs_analysis",
  "rpjmdes_draft",
  "program_recommendation",
] as const;
