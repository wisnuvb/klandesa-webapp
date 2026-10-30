"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePayment } from "@/components/billing/PaymentProvider";
import {
  CreditCard,
  History,
  Loader2,
  MessageSquarePlus,
  Mic,
  PanelLeftClose,
  Plus,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { LarasAvatar } from "@/components/ai/LarasAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMarkdown } from "@/components/ui/chat-markdown";
import { TypingChatMarkdown } from "@/components/ai/TypingChatMarkdown";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";
import { AI_CREDITS_CONSUMPTION_ENABLED } from "@/lib/ai/credits";
import { AI_CREDIT_PACKAGES } from "@/lib/ai/credit-packages";
import {
  AI_ASSISTANT_NAME,
  AI_ASSISTANT_TAGLINE,
  AI_ASSISTANT_TITLE,
} from "@/lib/ai/persona";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ThreadSummary = {
  id: number;
  mode: string;
  modeLabel: string;
  title: string;
  messageCount: number;
  updatedAt: string;
};

const MODES = [
  { id: "citizen_faq", label: "FAQ Layanan Warga" },
  { id: "sdgs_analysis", label: "Analisa SDGs" },
  { id: "rpjmdes_draft", label: "Draft RPJMDes" },
  { id: "program_recommendation", label: "Rekomendasi Program" },
] as const;

const CREDIT_PACKAGES = AI_CREDIT_PACKAGES;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

function formatThreadDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

const THINKING_STEPS_BY_MODE: Record<string, string[]> = {
  citizen_faq: [
    "Memahami pertanyaan…",
    "Mencari info layanan desa…",
    "Menyusun langkah yang jelas…",
  ],
  sdgs_analysis: [
    "Memahami konteks desa…",
    "Menganalisa skor SDGs…",
    "Menyusun prioritas intervensi…",
  ],
  rpjmdes_draft: [
    "Memahami konteks desa…",
    "Memetakan RPJMDes & SDGs…",
    "Menyusun draf rencana…",
  ],
  program_recommendation: [
    "Memahami konteks desa…",
    "Menganalisa kebutuhan program…",
    "Menyusun rekomendasi…",
  ],
};

const DEFAULT_THINKING_STEPS = [
  "Memahami konteks…",
  "Berpikir…",
  "Menganalisa…",
  "Menyusun jawaban…",
];

function getThinkingSteps(mode: string): string[] {
  return THINKING_STEPS_BY_MODE[mode] ?? DEFAULT_THINKING_STEPS;
}

export default function AsistenAiPage() {
  const { appConfirm } = useAppDialogs();
  const { pay } = usePayment();
  const [credits, setCredits] = useState<number | null>(null);
  const [mode, setMode] = useState<string>("citizen_faq");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
  const [topupOpen, setTopupOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(
    null,
  );
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const isBusy = loading || streamingMessageIndex !== null;

  const loadCredits = useCallback(async () => {
    try {
      const data = await fetchJson<{ remaining: number }>("/api/ai/credit");
      setCredits(data.remaining);
    } catch {
      setCredits(0);
    }
  }, []);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const data = await fetchJson<{ threads: ThreadSummary[] }>(
        "/api/ai/threads",
      );
      setThreads(data.threads);
    } catch {
      setThreads([]);
    } finally {
      setThreadsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCredits();
    void loadThreads();
  }, [loadCredits, loadThreads]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt")?.trim();
    const modeParam = params.get("mode")?.trim();
    if (modeParam && MODES.some((m) => m.id === modeParam)) {
      setMode(modeParam);
    }
    if (prompt) setInput(prompt);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, streamingMessageIndex, thinkingStep, scrollToBottom]);

  useEffect(() => {
    if (!loading) {
      setThinkingStep(null);
      return;
    }

    const steps = getThinkingSteps(mode);
    let index = 0;
    setThinkingStep(steps[0]);

    const id = window.setInterval(() => {
      index = Math.min(index + 1, steps.length - 1);
      setThinkingStep(steps[index]);
    }, 950);

    return () => window.clearInterval(id);
  }, [loading, mode]);

  const loadThread = useCallback(async (threadId: number) => {
    setMessagesLoading(true);
    setError(null);
    try {
      const data = await fetchJson<{
        thread: {
          id: number;
          mode: string;
          messages: ChatMessage[];
        };
      }>(`/api/ai/threads/${threadId}`);
      setActiveThreadId(data.thread.id);
      setMode(data.thread.mode);
      setStreamingMessageIndex(null);
      setMessages(
        data.thread.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat percakapan");
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  function startNewChat() {
    setActiveThreadId(null);
    setMessages([]);
    setError(null);
    setInput("");
    setStreamingMessageIndex(null);
  }

  async function deleteThread(threadId: number, e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await appConfirm({
      title: "Hapus percakapan?",
      description: "Riwayat chat ini akan dihapus permanen dari akun Anda.",
    });
    if (!ok) return;

    try {
      await fetchJson(`/api/ai/threads/${threadId}`, { method: "DELETE" });
      if (activeThreadId === threadId) {
        startNewChat();
      }
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || isBusy) return;

    setInput("");
    setError(null);
    const prevMessages = messages;
    const optimistic: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(optimistic);
    setLoading(true);

    try {
      const data = await fetchJson<{
        reply: string;
        threadId: number;
        remainingCredits: number | null;
      }>("/api/ai/village-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          mode,
          threadId: activeThreadId,
        }),
      });

      setActiveThreadId(data.threadId);
      setLoading(false);
      setMessages((prev) => {
        const nextIndex = prev.length;
        setStreamingMessageIndex(nextIndex);
        return [...prev, { role: "assistant", content: data.reply }];
      });
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      await loadThreads();
    } catch (e) {
      setMessages(prevMessages);
      setError(e instanceof Error ? e.message : "Gagal mengirim pesan");
      setStreamingMessageIndex(null);
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

  const modeLocked = activeThreadId != null;

  return (
    <div className="space-y-6 mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <LarasAvatar size={32} />
            {AI_ASSISTANT_TITLE}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {AI_ASSISTANT_TAGLINE} Riwayat tersimpan per akun Anda.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {AI_CREDITS_CONSUMPTION_ENABLED ? (
            <>
              <Badge variant="secondary" className="text-sm">
                Kredit: {credits === 0 ? "~" : (credits ?? "…")}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                  setSelectedPkg(null);
                  setTopupOpen(true);
                }}
              >
                <CreditCard className="h-3.5 w-3.5" /> Top Up
              </Button>
            </>
          ) : (
            <Badge variant="secondary" className="text-sm">
              Gratis
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              const key = prompt(
                "Masukkan OpenRouter API Key Anda (BYOK):",
                "",
              );
              if (key !== null) {
                // Simpan di state & localStorage untuk demo
                localStorage.setItem("byok_api_key", key.trim());
                alert(
                  key.trim()
                    ? "BYOK key disimpan. (Backend integration menyusul)"
                    : "BYOK dinonaktifkan.",
                );
              }
            }}
          >
            <Settings className="h-3.5 w-3.5" /> BYOK
          </Button>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          historyOpen && "lg:grid-cols-[minmax(220px,280px)_1fr]",
        )}
      >
        {historyOpen ? (
          <Card className="h-fit lg:max-h-[calc(100vh-12rem)] flex flex-col min-w-0 lg:sticky lg:top-4">
            <CardHeader className="pb-2 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">Riwayat</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => setHistoryOpen(false)}
                  aria-label="Sembunyikan riwayat"
                  title="Sembunyikan riwayat"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={startNewChat}
              >
                <MessageSquarePlus className="h-4 w-4" />
                Percakapan baru
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pt-0 space-y-1 min-h-0 max-h-[min(420px,calc(100vh-16rem))] lg:max-h-none">
              {threadsLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat riwayat…
                </div>
              ) : threads.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  Belum ada percakapan tersimpan.
                </p>
              ) : (
                threads.map((t) => (
                  <div
                    key={t.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => void loadThread(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        void loadThread(t.id);
                      }
                    }}
                    className={cn(
                      "group w-full rounded-lg border px-3 py-2 text-left transition-colors cursor-pointer",
                      activeThreadId === t.id
                        ? "border-primary bg-primary/5"
                        : "hover:bg-muted/60",
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <p className="text-sm font-medium line-clamp-2 leading-snug">
                        {t.title}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={(e) => void deleteThread(t.id, e)}
                        aria-label="Hapus percakapan"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t.modeLabel} · {t.messageCount} pesan
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatThreadDate(t.updatedAt)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ) : null}

        <Card className="min-w-0">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              {!historyOpen ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => setHistoryOpen(true)}
                  aria-label="Tampilkan riwayat"
                >
                  <History className="h-4 w-4" />
                  Riwayat
                </Button>
              ) : null}
              <CardTitle className="text-base">Percakapan</CardTitle>
              <Select
                value={mode}
                onValueChange={setMode}
                disabled={modeLocked}
              >
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
              {modeLocked ? (
                <span className="text-xs text-muted-foreground">
                  Mode mengikuti percakapan yang dibuka
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col min-h-[600px]">
            <div className="flex flex-wrap gap-2 mb-2">
              {(suggestions[mode] ?? []).map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 whitespace-normal text-left"
                  onClick={() => setInput(s)}
                  disabled={isBusy}
                >
                  <Sparkles className="h-3 w-3 mr-1 shrink-0" />
                  {s}
                </Button>
              ))}
            </div>

            <div
              className={cn(
                "flex-1 min-h-0 overflow-y-auto rounded-lg border bg-muted/20 p-4 space-y-3",
                messages.length === 0 && "flex items-center justify-center",
              )}
            >
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat pesan…
                </div>
              ) : null}
              {!messagesLoading && messages.length === 0 && (
                <div className="text-center max-w-md">
                  <LarasAvatar size={48} className="mx-auto mb-4" />
                  <p className="text-lg font-medium">
                    Halo! Saya {AI_ASSISTANT_NAME}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Asisten digital untuk perangkat desa. Mulai percakapan baru
                    atau pilih riwayat di sebelah kiri.
                  </p>
                </div>
              )}
              {!messagesLoading &&
                messages.map((m, i) => {
                  const isUser = m.role === "user";
                  const isStreaming =
                    !isUser && streamingMessageIndex === i;
                  return (
                    <div
                      key={`${m.role}-${i}`}
                      className={cn(
                        "flex gap-2",
                        isUser ? "flex-row-reverse" : "flex-row",
                      )}
                    >
                      {isUser ? (
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                          aria-hidden
                        >
                          <User className="h-4 w-4" />
                        </div>
                      ) : (
                        <LarasAvatar size={32} className="mt-0.5" />
                      )}
                      <div
                        className={cn(
                          "min-w-0 max-w-[min(85%,42rem)] rounded-2xl px-3.5 py-2.5 shadow-sm",
                          isUser
                            ? "rounded-tr-md bg-primary text-primary-foreground"
                            : "rounded-tl-md border bg-card",
                        )}
                      >
                        {isUser ? (
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {m.content}
                          </p>
                        ) : isStreaming ? (
                          <TypingChatMarkdown
                            content={m.content}
                            enabled
                            onComplete={() => setStreamingMessageIndex(null)}
                            onTick={scrollToBottom}
                          />
                        ) : (
                          <ChatMarkdown content={m.content} />
                        )}
                      </div>
                    </div>
                  );
                })}
              {loading && thinkingStep ? (
                <div className="flex gap-2">
                  <LarasAvatar size={32} className="mt-0.5" />
                  <div className="flex items-center gap-2.5 rounded-2xl rounded-tl-md border bg-card px-3.5 py-2.5 text-sm text-muted-foreground min-w-[12rem]">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary/70" />
                    <span key={thinkingStep} className="animate-in fade-in duration-300">
                      {thinkingStep}
                    </span>
                  </div>
                </div>
              ) : null}
              <div ref={bottomRef} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div
              className={cn(
                "mt-auto pt-4",
                messages.length > 0 && "sticky bottom-0 bg-card pb-1",
              )}
            >
              <div className="text-xs text-muted-foreground mb-1.5 px-1 hidden">
                {AI_CREDITS_CONSUMPTION_ENABLED
                  ? "1 kredit per pesan"
                  : "Tanpa pemotongan kredit (sementara)"}
              </div>
              <div className="flex items-end gap-1 rounded-3xl border bg-background px-2 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring/40">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => alert("Fitur lampirkan file akan datang")}
                  disabled={isBusy}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tanyakan apa saja"
                  rows={1}
                  className={cn(
                    "flex-1 min-h-9 max-h-32 resize-none !border-0 bg-transparent px-1 py-2 !shadow-none",
                    "!rounded-none outline-none !ring-0",
                    "focus-visible:!border-0 focus-visible:!ring-0 focus-visible:outline-none",
                    "placeholder:text-muted-foreground",
                  )}
                  disabled={isBusy || messagesLoading}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => alert("Voice input akan segera tersedia")}
                  disabled={isBusy}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-full"
                  disabled={isBusy || messagesLoading || !input.trim()}
                  onClick={() => void send()}
                >
                  {isBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Kredit AI</DialogTitle>
            <DialogDescription>
              Pilih paket kredit. Biaya per pertanyaan memerlukan 1 kredit.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 py-2">
            {CREDIT_PACKAGES.map((pkg) => (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setSelectedPkg(pkg.id)}
                aria-pressed={selectedPkg === pkg.id}
                className={cn(
                  "rounded-xl border p-3 text-left transition",
                  selectedPkg === pkg.id
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted",
                )}
              >
                <div className="font-semibold">{pkg.label}</div>
                <div className="text-xs text-muted-foreground">{pkg.desc}</div>
                <div className="mt-1 text-lg font-bold text-primary">
                  Rp {pkg.price.toLocaleString("id-ID")}
                </div>
              </button>
            ))}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTopupOpen(false)}>
              Batal
            </Button>
            <Button
              disabled={!selectedPkg}
              onClick={() => {
                const pkg = CREDIT_PACKAGES.find((p) => p.id === selectedPkg);
                if (!pkg) return;
                setTopupOpen(false);
                pay({
                  productType: "ai_credits",
                  planCode: String(pkg.credits),
                  title: `Top Up Kredit AI (${pkg.label})`,
                  amount: pkg.price,
                  successMessage: "Kredit AI telah ditambahkan ke akun Anda.",
                  onPaid: loadCredits,
                });
              }}
            >
              Lanjut ke pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
