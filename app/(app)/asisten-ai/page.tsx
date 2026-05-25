"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ChatMessage = { role: "user" | "assistant"; content: string };

const MODES = [
  { id: "citizen_faq", label: "FAQ Layanan Warga" },
  { id: "sdgs_analysis", label: "Analisa SDGs" },
  { id: "rpjmdes_draft", label: "Draft RPJMDes" },
  { id: "program_recommendation", label: "Rekomendasi Program" },
] as const;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

export default function AsistenAiPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [mode, setMode] = useState<string>("citizen_faq");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadCredits = useCallback(async () => {
    try {
      const data = await fetchJson<{ remaining: number }>("/api/ai/credit");
      setCredits(data.remaining);
    } catch {
      setCredits(0);
    }
  }, []);

  useEffect(() => {
    void loadCredits();
  }, [loadCredits]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const data = await fetchJson<{
        reply: string;
        remainingCredits: number | null;
      }>("/api/ai/village-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode,
          history: nextMessages.slice(-8),
        }),
      });

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal mengirim pesan");
    } finally {
      setLoading(false);
    }
  }

  const suggestions: Record<string, string[]> = {
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

  return (
    <div className="space-y-6 p-4 md:p-6 container mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Bot className="h-7 w-7" />
            Asisten Desa AI
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analisa SDGs, draft RPJMDes, rekomendasi program, dan FAQ layanan warga.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Kredit: {credits ?? "…"}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-base">Mode Asisten</CardTitle>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MODES.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(suggestions[mode] ?? []).map((s) => (
              <Button
                key={s}
                variant="outline"
                size="sm"
                className="text-xs h-auto py-1.5 whitespace-normal text-left"
                onClick={() => setInput(s)}
              >
                <Sparkles className="h-3 w-3 mr-1 shrink-0" />
                {s}
              </Button>
            ))}
          </div>

          <div className="min-h-[320px] max-h-[480px] overflow-y-auto rounded-lg border bg-muted/20 p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Mulai percakapan — asisten akan memakai data SDGs dan profil desa Anda.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background border"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Asisten mengetik…
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tulis pertanyaan…"
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
            />
            <Button
              className="shrink-0"
              disabled={loading || !input.trim()}
              onClick={() => void send()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
