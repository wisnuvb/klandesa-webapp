"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowDown, CreditCard, History, Info, Loader2, MessageSquarePlus, X } from "lucide-react";
import { usePayment } from "@/components/billing/PaymentProvider";
import { LarasAvatar } from "@/components/ai/LarasAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/components/ui/utils";
import { usePageScrollLock } from "@/components/layout/PageHeaderContext";
import { useAppDialogs } from "@/components/providers/AppDialogProvider";
import type { ActionCard } from "@/lib/ai/laras-actions";
import { NDJSON_CONTENT_TYPE, readNdjson } from "@/lib/ai/ndjson";
import { AI_CREDITS_CONSUMPTION_ENABLED } from "@/lib/ai/credits";
import { AI_CREDIT_PACKAGES } from "@/lib/ai/credit-packages";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Composer } from "./_components/Composer";
import { EmptyState } from "./_components/EmptyState";
import { HistoryPanel } from "./_components/HistoryPanel";
import { MessageBubble } from "./_components/MessageBubble";
import { KNOWN_MODES, type ChatMessage, type ThreadSummary } from "./_components/types";

const CREDIT_PACKAGES = AI_CREDIT_PACKAGES;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Gagal memuat data");
  return data as T;
}

type ChatReply = {
  reply: string;
  threadId: number;
  remainingCredits: number | null;
  notice?: string;
  actions?: ActionCard[];
};

/**
 * Kirim pertanyaan ke Laras. Meminta aliran status (NDJSON) agar langkah yang sedang berjalan terlihat; bila server atau
 * proxy membalas JSON biasa (atau galat sebelum aliran dimulai), tetap ditangani seperti biasa.
 */
async function askLaras(
  body: { message: string; mode: string; threadId: number | null },
  onProgress: (label: string) => void,
): Promise<ChatReply> {
  const res = await fetch("/api/ai/village-assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: `${NDJSON_CONTENT_TYPE}, application/json` },
    body: JSON.stringify(body),
  });
  const isStream = res.headers.get("content-type")?.includes(NDJSON_CONTENT_TYPE) && res.body;
  if (!isStream) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Gagal memuat data");
    return data as ChatReply;
  }

  let done: ChatReply | null = null;
  let failure: string | null = null;
  await readNdjson(res.body!, (e) => {
    if (e.type === "progress") onProgress(e.label);
    else if (e.type === "done") done = e as unknown as ChatReply;
    else if (e.type === "error") failure = e.error;
  });
  if (failure) throw new Error(failure);
  if (!done) {
    throw new Error(
      "Koneksi terputus sebelum jawaban selesai. Buka kembali riwayat percakapan untuk melihat apakah jawabannya sudah tersimpan.",
    );
  }
  return done;
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
  // Halaman setinggi layar: hanya daftar pesan dan riwayat yang bergulir, kotak tulis selalu terlihat.
  usePageScrollLock(true);

  const { appConfirm } = useAppDialogs();
  const { pay } = usePayment();
  const [credits, setCredits] = useState<number | null>(null);
  const [mode, setMode] = useState<string>("general");
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [historyOpen, setHistoryOpen] = useState(true);
  const [historySheetOpen, setHistorySheetOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [streamingMessageIndex, setStreamingMessageIndex] = useState<number | null>(null);
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);

  const scrollerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** true = pengguna ada di dasar daftar, jadi pesan baru boleh menarik gulir ke bawah. */
  const stickRef = useRef(true);

  const isBusy = loading || streamingMessageIndex !== null;
  const noCredits = AI_CREDITS_CONSUMPTION_ENABLED && credits === 0;
  const hasThread = activeThreadId != null;

  const scrollToBottom = useCallback((opts?: { force?: boolean; smooth?: boolean }) => {
    const el = scrollerRef.current;
    if (!el) return;
    // Jangan menyeret pengguna yang sedang membaca bagian atas percakapan.
    if (!opts?.force && !stickRef.current) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: opts?.smooth && !reduceMotion ? "smooth" : "auto" });
  }, []);

  const handleScroll = () => {
    const el = scrollerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    stickRef.current = nearBottom;
    setShowJump(!nearBottom);
  };

  const loadCredits = useCallback(async () => {
    try {
      const data = await fetchJson<{ remaining: number }>("/api/ai/credit");
      setCredits(data.remaining);
    } catch {
      /* biarkan nilai sebelumnya: gagal memuat bukan berarti kredit habis */
    }
  }, []);

  const loadThreads = useCallback(async () => {
    setThreadsLoading(true);
    try {
      const data = await fetchJson<{ threads: ThreadSummary[] }>("/api/ai/threads");
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
    if (modeParam && (KNOWN_MODES as readonly string[]).includes(modeParam)) {
      setMode(modeParam);
    }
    if (prompt) {
      setInput(prompt);
      textareaRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    scrollToBottom({ smooth: true });
  }, [messages.length, loading, scrollToBottom]);

  // Selesai memuat percakapan: langsung ke pesan terakhir (tanpa animasi gulir dari atas).
  useEffect(() => {
    if (!messagesLoading) scrollToBottom({ force: true });
  }, [messagesLoading, scrollToBottom]);

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
      stickRef.current = true;
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
    setNotice(null);
    setInput("");
    setStreamingMessageIndex(null);
    setHistorySheetOpen(false);
    textareaRef.current?.focus();
  }

  function openThread(threadId: number) {
    setHistorySheetOpen(false);
    void loadThread(threadId);
  }

  async function deleteThread(thread: ThreadSummary) {
    const ok = await appConfirm({
      title: "Hapus percakapan?",
      description: `"${thread.title}" akan dihapus permanen dari akun Anda.`,
    });
    if (!ok) return;

    try {
      await fetchJson(`/api/ai/threads/${thread.id}`, { method: "DELETE" });
      if (activeThreadId === thread.id) {
        startNewChat();
      }
      await loadThreads();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus");
    }
  }

  function pickSuggestion(text: string) {
    setInput(text);
    textareaRef.current?.focus();
  }

  function openTopup() {
    setSelectedPkg(null);
    setTopupOpen(true);
  }

  async function send() {
    const text = input.trim();
    if (!text || isBusy || noCredits) return;

    setInput("");
    setError(null);
    setNotice(null);
    stickRef.current = true;
    setShowJump(false);
    const prevMessages = messages;
    const optimistic: ChatMessage[] = [...messages, { role: "user", content: text }];
    setMessages(optimistic);
    setProgressLabel(null);
    setAnnouncement("Laras sedang menyusun jawaban…");
    setLoading(true);

    try {
      const data = await askLaras({ message: text, mode, threadId: activeThreadId }, setProgressLabel);

      setActiveThreadId(data.threadId);
      if (data.notice) setNotice(data.notice);
      setLoading(false);
      setMessages((prev) => {
        const nextIndex = prev.length;
        setStreamingMessageIndex(nextIndex);
        return [...prev, { role: "assistant", content: data.reply, actions: data.actions }];
      });
      setAnnouncement("Jawaban dari Laras sudah tampil.");
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      await loadThreads();
    } catch (e) {
      setMessages(prevMessages);
      // Kembalikan pertanyaan ke kotak tulis agar tidak perlu mengetik ulang (kecuali sudah mengetik hal baru).
      setInput((cur) => (cur.trim() ? cur : text));
      setAnnouncement("");
      setError(e instanceof Error ? e.message : "Gagal mengirim pesan");
      setStreamingMessageIndex(null);
    } finally {
      setLoading(false);
      setProgressLabel(null);
    }
  }

  const historyPanelProps = {
    threads,
    loading: threadsLoading,
    activeId: activeThreadId,
    onNew: startNewChat,
    onDelete: (t: ThreadSummary) => void deleteThread(t),
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] gap-4",
          historyOpen && "lg:grid-cols-[minmax(240px,280px)_minmax(0,1fr)]",
        )}
      >
        {historyOpen ? (
          <aside className="hidden min-h-0 flex-col overflow-hidden rounded-xl border bg-card lg:flex">
            <HistoryPanel {...historyPanelProps} onSelect={openThread} onCollapse={() => setHistoryOpen(false)} />
          </aside>
        ) : null}

        <section className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="flex flex-wrap items-center gap-2 border-b px-3 py-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5 lg:hidden"
              onClick={() => setHistorySheetOpen(true)}
            >
              <History className="size-4" aria-hidden="true" />
              Riwayat
            </Button>
            {!historyOpen ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden gap-1.5 lg:inline-flex"
                onClick={() => setHistoryOpen(true)}
              >
                <History className="size-4" aria-hidden="true" />
                Riwayat
              </Button>
            ) : null}
            <div className="ml-auto flex items-center gap-2">
              {messages.length > 0 || hasThread ? (
                <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={startNewChat}>
                  <MessageSquarePlus className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Percakapan baru</span>
                  <span className="sr-only sm:hidden">Percakapan baru</span>
                </Button>
              ) : null}
              {AI_CREDITS_CONSUMPTION_ENABLED ? (
                <>
                  <Badge variant={noCredits ? "destructive" : "secondary"} className="text-sm">
                    {noCredits ? "Kredit habis" : `Kredit: ${credits ?? "…"}`}
                  </Badge>
                  <Button
                    type="button"
                    variant={noCredits ? "default" : "outline"}
                    size="sm"
                    className="gap-1.5"
                    onClick={openTopup}
                  >
                    <CreditCard className="size-3.5" aria-hidden="true" /> Top Up
                  </Button>
                </>
              ) : (
                <Badge variant="secondary" className="text-sm">
                  Gratis
                </Badge>
              )}
            </div>
          </div>

          <div className="relative min-h-0 flex-1 bg-muted/20">
            <div ref={scrollerRef} onScroll={handleScroll} className="h-full overflow-y-auto">
              <div
                className={cn(
                  "mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6",
                  messages.length === 0 && !messagesLoading && "min-h-full justify-center",
                )}
              >
                {messagesLoading ? (
                  <div className="space-y-5" role="status" aria-busy="true">
                    <span className="sr-only">Memuat pesan…</span>
                    <div className="flex gap-2.5 flex-row-reverse">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <Skeleton className="h-10 w-56 rounded-2xl" />
                    </div>
                    <div className="flex gap-2.5">
                      <Skeleton className="size-8 shrink-0 rounded-full" />
                      <Skeleton className="h-28 w-full max-w-lg rounded-2xl" />
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyState onPick={pickSuggestion} />
                ) : (
                  messages.map((m, i) => (
                    <MessageBubble
                      key={`${m.role}-${i}`}
                      message={m}
                      streaming={m.role === "assistant" && streamingMessageIndex === i}
                      onTick={() => scrollToBottom()}
                      onTypingComplete={() => setStreamingMessageIndex(null)}
                    />
                  ))
                )}
                {loading && thinkingStep ? (
                  <div className="flex gap-2.5">
                    <LarasAvatar size={32} className="mt-0.5" />
                    <div className="flex min-w-[12rem] items-center gap-2.5 rounded-2xl rounded-tl-md border bg-card px-4 py-2.5 text-sm text-muted-foreground">
                      <Loader2 className="size-4 shrink-0 animate-spin text-primary/70" aria-hidden="true" />
                      <span key={progressLabel ?? thinkingStep} className="animate-in fade-in duration-300">
                        {progressLabel ?? thinkingStep}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
            {showJump ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="absolute bottom-3 left-1/2 -translate-x-1/2 gap-1.5 rounded-full shadow-md"
                onClick={() => {
                  stickRef.current = true;
                  scrollToBottom({ force: true, smooth: true });
                }}
              >
                <ArrowDown className="size-4" aria-hidden="true" />
                Pesan terbaru
              </Button>
            ) : null}
          </div>

          <div className="space-y-2 border-t bg-card px-3 pb-3 pt-3">
            <div className="mx-auto w-full max-w-3xl space-y-2">
              {noCredits ? (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  <span>Kredit AI Anda habis. Top up untuk melanjutkan bertanya.</span>
                  <Button type="button" size="sm" onClick={openTopup}>
                    Top Up
                  </Button>
                </div>
              ) : null}
              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{error}</span>
                  <button
                    type="button"
                    onClick={() => setError(null)}
                    aria-label="Tutup pesan galat"
                    className="rounded p-0.5 hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </div>
              ) : null}
              {notice ? (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {notice}
                </p>
              ) : null}
              <Composer
                value={input}
                onChange={setInput}
                onSend={() => void send()}
                textareaRef={textareaRef}
                busy={isBusy}
                sendDisabled={messagesLoading || noCredits}
              />
            </div>
          </div>
          <div className="sr-only" role="status" aria-live="polite">
            {announcement}
          </div>
        </section>
      </div>

      <Sheet open={historySheetOpen} onOpenChange={setHistorySheetOpen}>
        <SheetContent side="left" className="w-80 gap-0 p-0 sm:max-w-xs">
          <SheetHeader className="sr-only">
            <SheetTitle>Riwayat percakapan</SheetTitle>
            <SheetDescription>Pilih percakapan sebelumnya atau mulai yang baru.</SheetDescription>
          </SheetHeader>
          <HistoryPanel {...historyPanelProps} onSelect={openThread} />
        </SheetContent>
      </Sheet>

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
