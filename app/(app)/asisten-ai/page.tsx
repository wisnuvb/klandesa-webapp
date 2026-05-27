"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  History,
  Loader2,
  MessageSquarePlus,
  PanelLeftClose,
  Send,
  Sparkles,
  Trash2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChatMarkdown } from "@/components/ui/chat-markdown";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/components/ui/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(true);
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

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);
    const prevMessages = messages;
    const optimistic: ChatMessage[] = [...messages, { role: "user", content: text }];
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
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      if (typeof data.remainingCredits === "number") {
        setCredits(data.remainingCredits);
      }
      await loadThreads();
    } catch (e) {
      setMessages(prevMessages);
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

  const modeLocked = activeThreadId != null;

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
            Riwayat tersimpan per akun Anda.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Kredit: {credits ?? "…"}
        </Badge>
      </div>

      <div
        className={cn(
          "grid gap-4",
          historyOpen && "lg:grid-cols-[minmax(220px,280px)_1fr]",
        )}
      >
        {historyOpen ? (
          <Card className="h-fit lg:max-h-[calc(100vh-12rem)] flex flex-col min-w-0">
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
          <CardHeader className="pb-3">
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
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
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

            <div className="min-h-[320px] max-h-[480px] overflow-y-auto rounded-lg border bg-muted/20 p-4 space-y-3">
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Memuat pesan…
                </div>
              ) : null}
              {!messagesLoading && messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Mulai percakapan baru atau pilih riwayat di sebelah kiri. Setiap
                  balasan otomatis disimpan.
                </p>
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
                      <div
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted border",
                        )}
                        aria-hidden
                      >
                        {isUser ? (
                          <User className="h-4 w-4" />
                        ) : (
                          <Bot className="h-4 w-4" />
                        )}
                      </div>
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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-muted">
                    <Bot className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="flex items-center gap-2 rounded-2xl rounded-tl-md border bg-card px-3.5 py-2.5 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Asisten mengetik…
                  </div>
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
                disabled={loading || messagesLoading}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button
                className="shrink-0"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
