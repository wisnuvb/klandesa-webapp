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

export const MODES = [
  {
    id: "citizen_faq",
    label: "FAQ Layanan Warga",
    intro: "Tanyakan syarat dan alur layanan administrasi desa.",
  },
  {
    id: "sdgs_analysis",
    label: "Analisa SDGs",
    intro: "Baca skor SDGs desa Anda dan temukan prioritas tindakannya.",
  },
  {
    id: "rpjmdes_draft",
    label: "Draft RPJMDes",
    intro: "Susun draf rencana pembangunan yang selaras dengan SDGs.",
  },
  {
    id: "program_recommendation",
    label: "Rekomendasi Program",
    intro: "Dapatkan ide program desa sesuai kebutuhan warga.",
  },
] as const;

export const SUGGESTIONS: Record<string, string[]> = {
  citizen_faq: [
    "Bagaimana cara mengajukan surat keterangan domisili?",
    "Siapa yang berhak mendaftar program bansos desa?",
  ],
  sdgs_analysis: [
    "Goal SDGs mana yang paling perlu intervensi di desa kami?",
    "Ringkas kondisi SDGs desa dan 3 prioritas tindakan.",
  ],
  rpjmdes_draft: [
    "Buat draf visi-misi RPJMDes 5 tahun selaras SDGs.",
    "Tuliskan program prioritas infrastruktur untuk RPJMDes.",
  ],
  program_recommendation: [
    "Rekomendasikan program PKK untuk menurunkan stunting.",
    "Program BUMDes apa yang cocok untuk goal SDGs 8?",
  ],
};
