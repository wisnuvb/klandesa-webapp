"use client";

import { useEffect, useRef, useState } from "react";
import { Shuffle, Sparkles } from "lucide-react";
import { LarasAvatar } from "@/components/ai/LarasAvatar";
import { Button } from "@/components/ui/button";
import { AI_ASSISTANT_NAME } from "@/lib/ai/persona";
import { SUGGESTION_CATEGORIES, pickSuggestions, type Suggestion } from "@/lib/ai/suggestions";

type EmptyStateProps = {
  onPick: (text: string) => void;
};

const COUNT = 4;

/** Sambutan + contoh pertanyaan acak lintas topik, supaya pengguna langsung tahu apa saja yang bisa ditanyakan. */
export function EmptyState({ onPick }: EmptyStateProps) {
  // Diacak setelah mount: acak saat render server akan berbeda dengan klien (hydration mismatch).
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [round, setRound] = useState(0);
  const shownRef = useRef<string[]>([]);

  const shuffle = () => {
    const next = pickSuggestions({ count: COUNT, exclude: shownRef.current });
    shownRef.current = next.map((s) => s.text);
    setSuggestions(next);
    setRound((r) => r + 1);
  };

  useEffect(() => {
    shuffle();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center text-center">
      <LarasAvatar size={64} className="mb-4 shadow-sm" />
      <h2 className="text-xl font-semibold tracking-tight">Halo! Saya {AI_ASSISTANT_NAME}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Saya bisa membantu soal layanan warga, SDGs, perencanaan, hingga data harian desa Anda. Tulis pertanyaan di
        bawah, atau mulai dari salah satu contoh ini:
      </p>

      {/* Tinggi dipesan dulu supaya tata letak tidak melompat saat contoh muncul. */}
      <ul className="mt-5 grid min-h-[9.5rem] w-full content-start gap-2.5 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <li key={`${round}-${s.text}`}>
            <button
              type="button"
              onClick={() => onPick(s.text)}
              style={{ animationDelay: `${i * 60}ms` }}
              className="group flex h-full w-full animate-in fade-in slide-in-from-bottom-1 flex-col items-start gap-1.5 rounded-xl border bg-card p-3.5 text-left text-sm shadow-sm transition-all fill-mode-both hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:animate-none motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <Sparkles className="size-3.5" aria-hidden="true" />
                {SUGGESTION_CATEGORIES[s.category]}
              </span>
              <span>{s.text}</span>
            </button>
          </li>
        ))}
      </ul>

      <Button type="button" variant="ghost" size="sm" className="mt-3 gap-1.5 text-muted-foreground" onClick={shuffle}>
        <Shuffle className="size-4" aria-hidden="true" />
        Contoh lain
      </Button>
    </div>
  );
}
