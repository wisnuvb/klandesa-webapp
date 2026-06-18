"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";
import { AI_CREDITS_CONSUMPTION_ENABLED } from "@/lib/ai/credits";
import {
  AI_MODEL_STORAGE_KEY,
  defaultAiModelId,
  labelForAiModel,
  SELECTABLE_AI_MODELS,
  type SelectableAiModelId,
} from "@/lib/ai/models";
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
import Image from "next/image";

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

const CREDIT_PACKAGES = [
  {
    id: "pkg1",
    credits: 250,
    price: 50000,
    label: "250 Kredit",
    desc: "~250 pertanyaan",
  },
  {
    id: "pkg2",
    credits: 500,
    price: 90000,
    label: "500 Kredit",
    desc: "~500 pertanyaan",
  },
  {
    id: "pkg3",
    credits: 1333,
    price: 200000,
    label: "1333 Kredit",
    desc: "Paling populer",
  },
  {
    id: "pkg4",
    credits: 2500,
    price: 350000,
    label: "2500 Kredit",
    desc: "Hemat 30%",
  },
] as const;

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

export default function AsistenAiPage() {
  const { appConfirm } = useAppDialogs();
  const [credits, setCredits] = useState<number | null>(null);
  const [mode, setMode] = useState<string>("citizen_faq");
  const [model, setModel] = useState<SelectableAiModelId>(defaultAiModelId());
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
  const [paymentMethod, setPaymentMethod] = useState<"VA" | "EWALLET" | null>(
    null,
  );
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [invoiceData, setInvoiceData] = useState<{
    partnerReff: string;
    status: string;
    amount: number;
    vaNumber?: string | null;
    qrImageUrl?: string | null;
    paymentUrl?: string | null;
    qrContent?: string | null;
    expiresAt?: Date | null;
  } | null>(null);
  const [thinkingStep, setThinkingStep] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

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
    try {
      const stored = localStorage.getItem(AI_MODEL_STORAGE_KEY);
      if (
        stored &&
        SELECTABLE_AI_MODELS.some((m) => m.id === stored)
      ) {
        setModel(stored as SelectableAiModelId);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const prompt = params.get("prompt")?.trim();
    if (prompt) setInput(prompt);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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

  async function runThinkingSteps(modelLabel: string) {
    const steps = [
      "Menganalisa pertanyaan dan konteks desa…",
      `Memproses dengan ${modelLabel}…`,
      "Menyusun balasan yang relevan…",
    ];
    for (const step of steps) {
      setThinkingStep(step);
      await new Promise((r) => setTimeout(r, 650));
    }
    setThinkingStep(null);
  }

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    const prevMessages = messages;
    const optimistic: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(optimistic);
    setLoading(true);

    const currentModel = labelForAiModel(model);

    // Mulai animasi thinking realtime
    void runThinkingSteps(currentModel);

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
          model,
          threadId: activeThreadId,
        }),
      });

      setActiveThreadId(data.threadId);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      await loadThreads();
    } catch (e) {
      setMessages(prevMessages);
      setError(e instanceof Error ? e.message : "Gagal mengirim pesan");
      setThinkingStep(null);
    } finally {
      setLoading(false);
      setThinkingStep(null);
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
                  setPaymentMethod(null);
                  setTopupOpen(true);
                }}
              >
                <CreditCard className="h-3.5 w-3.5" /> Top Up
              </Button>
            </>
          ) : (
            <Badge variant="secondary" className="text-sm">
              Gratis · Nemotron 3 Nano
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
              <Select
                value={model}
                onValueChange={(value) => {
                  const next = value as SelectableAiModelId;
                  setModel(next);
                  try {
                    localStorage.setItem(AI_MODEL_STORAGE_KEY, next);
                  } catch {
                    /* ignore */
                  }
                }}
              >
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SELECTABLE_AI_MODELS.map((m) => (
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
                  disabled={loading}
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
                        ) : (
                          <ChatMarkdown content={m.content} />
                        )}
                      </div>
                    </div>
                  );
                })}
              {loading && (
                <div className="flex gap-2">
                  <LarasAvatar size={32} />
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {thinkingStep || `${AI_ASSISTANT_NAME} sedang mengetik…`}
                  </div>
                </div>
              )}
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
                Model: {labelForAiModel(model)}
                {AI_CREDITS_CONSUMPTION_ENABLED
                  ? " · 1 kredit per pesan"
                  : " · tanpa pemotongan kredit (sementara)"}
              </div>
              <div className="flex items-end gap-1 rounded-3xl border bg-background px-2 py-1.5 shadow-sm focus-within:ring-1 focus-within:ring-ring/40">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={() => alert("Fitur lampirkan file akan datang")}
                  disabled={loading}
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
                  disabled={loading || messagesLoading}
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
                  disabled={loading}
                >
                  <Mic className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className="shrink-0 h-9 w-9 rounded-full"
                  disabled={loading || messagesLoading || !input.trim()}
                  onClick={() => void send()}
                >
                  {loading ? (
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

      <Dialog
        open={topupOpen}
        onOpenChange={(open) => {
          setTopupOpen(open);
          if (!open) setInvoiceData(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Top Up Kredit AI</DialogTitle>
            <DialogDescription>
              Pilih paket kredit. Biaya per pertanyaan memerlukan 1 kredit.
            </DialogDescription>
          </DialogHeader>

          {!invoiceData ? (
            <div className="space-y-4 py-2">
              <div>
                <p className="text-sm font-medium mb-2">Pilih Paket</p>
                <div className="grid grid-cols-2 gap-2">
                  {CREDIT_PACKAGES.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => setSelectedPkg(pkg.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition",
                        selectedPkg === pkg.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted",
                      )}
                    >
                      <div className="font-semibold">{pkg.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {pkg.desc}
                      </div>
                      <div className="mt-1 text-lg font-bold text-primary">
                        Rp {pkg.price.toLocaleString("id-ID")}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">
                  Metode Pembayaran (LinkQu)
                </p>
                <div className="flex gap-2">
                  {(["VA", "EWALLET"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPaymentMethod(m)}
                      className={cn(
                        "flex-1 rounded-xl border py-3 text-sm font-medium transition",
                        paymentMethod === m
                          ? "border-primary bg-primary text-primary-foreground"
                          : "hover:bg-muted",
                      )}
                    >
                      {m === "VA" ? "Virtual Account" : "E-Wallet (DANA/OVO)"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {invoiceData.status === "paid" ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <p className="font-semibold text-lg">Pembayaran Berhasil!</p>
                  <p className="text-sm text-muted-foreground">
                    Kredit AI telah ditambahkan ke akun Anda.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Total Bayar
                      </span>
                      <span className="font-bold text-lg">
                        Rp {invoiceData.amount.toLocaleString("id-ID")}
                      </span>
                    </div>
                    {invoiceData.vaNumber && (
                      <div className="space-y-1">
                        <span className="text-sm text-muted-foreground">
                          Nomor VA
                        </span>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-muted rounded-lg px-3 py-2 text-sm font-mono">
                            {invoiceData.vaNumber}
                          </code>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (invoiceData.vaNumber) {
                                void navigator.clipboard.writeText(
                                  invoiceData.vaNumber,
                                );
                                toast.success("Nomor VA disalin");
                              }
                            }}
                          >
                            Salin
                          </Button>
                        </div>
                      </div>
                    )}
                    {invoiceData.qrImageUrl && (
                      <div className="space-y-1 text-center">
                        <span className="text-sm text-muted-foreground">
                          Scan QRIS
                        </span>
                        <Image
                          src={invoiceData.qrImageUrl}
                          alt="QRIS"
                          className="mx-auto rounded-lg border"
                          width={200}
                          height={200}
                        />
                      </div>
                    )}
                    {invoiceData.paymentUrl &&
                      !invoiceData.vaNumber &&
                      !invoiceData.qrImageUrl && (
                        <div className="text-center">
                          <a
                            href={invoiceData.paymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary underline"
                          >
                            Buka halaman pembayaran
                          </a>
                        </div>
                      )}
                    <p className="text-xs text-muted-foreground text-center">
                      Invoice: {invoiceData.partnerReff}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Status pembayaran akan diperbarui otomatis. Tutup dialog ini
                    jika sudah membayar.
                  </p>
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {!invoiceData ? (
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <Button variant="outline" onClick={() => setTopupOpen(false)}>
                  Batal
                </Button>
                <Button
                  disabled={!selectedPkg || !paymentMethod || checkoutLoading}
                  onClick={async () => {
                    const pkg = CREDIT_PACKAGES.find(
                      (p) => p.id === selectedPkg,
                    );
                    if (!pkg || !paymentMethod) return;
                    setCheckoutLoading(true);
                    try {
                      const result = await fetchJson<{
                        ok: boolean;
                        invoice: {
                          partnerReff: string;
                          status: string;
                          amount: number;
                          vaNumber?: string | null;
                          qrImageUrl?: string | null;
                          paymentUrl?: string | null;
                          qrContent?: string | null;
                          expiresAt?: string | null;
                        };
                      }>("/api/ai/topup", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          packageId: selectedPkg,
                          paymentMethod: paymentMethod.toLowerCase(),
                        }),
                      });
                      if (result.ok && result.invoice) {
                        setInvoiceData({
                          ...result.invoice,
                          expiresAt: result.invoice.expiresAt
                            ? new Date(result.invoice.expiresAt)
                            : null,
                        });
                        loadCredits();
                        // Start polling for status
                        const interval = setInterval(async () => {
                          try {
                            const poll = await fetchJson<{
                              ok: boolean;
                              invoice?: {
                                status: string;
                                paidAt?: string | null;
                              };
                              credits?: number;
                            }>(
                              `/api/ai/topup/status?ref=${encodeURIComponent(result.invoice.partnerReff)}`,
                            );
                            if (poll.ok && poll.invoice?.status === "paid") {
                              setInvoiceData((prev) =>
                                prev ? { ...prev, status: "paid" } : prev,
                              );
                              if (poll.credits != null)
                                setCredits(poll.credits);
                              clearInterval(interval);
                            }
                          } catch {
                            // ignore polling errors
                          }
                        }, 5000);
                        // Stop polling after 10 minutes
                        setTimeout(
                          () => clearInterval(interval),
                          10 * 60 * 1000,
                        );
                      } else {
                        toast.error("Gagal membuat transaksi");
                      }
                    } catch (err) {
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Gagal membuat transaksi",
                      );
                    } finally {
                      setCheckoutLoading(false);
                    }
                  }}
                >
                  {checkoutLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Bayar Sekarang"
                  )}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => {
                  setTopupOpen(false);
                  setInvoiceData(null);
                }}
              >
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
