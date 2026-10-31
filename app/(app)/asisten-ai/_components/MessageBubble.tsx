"use client";

import { useState } from "react";
import { Check, Copy, User } from "lucide-react";
import { toast } from "sonner";
import { LarasAvatar } from "@/components/ai/LarasAvatar";
import { LarasActionCards } from "@/components/ai/LarasActionCards";
import { TypingChatMarkdown } from "@/components/ai/TypingChatMarkdown";
import { ChatMarkdown } from "@/components/ui/chat-markdown";
import { cn } from "@/components/ui/utils";
import type { ChatMessage } from "./types";

type MessageBubbleProps = {
  message: ChatMessage;
  /** Jawaban sedang "diketik" (animasi muncul bertahap). */
  streaming: boolean;
  onTick: () => void;
  onTypingComplete: () => void;
};

export function MessageBubble({ message, streaming, onTick, onTypingComplete }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      toast.success("Jawaban disalin");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Tidak dapat menyalin. Pilih teks lalu salin manual.");
    }
  };

  return (
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {isUser ? (
        <div
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-hidden="true"
        >
          <User className="size-4" />
        </div>
      ) : (
        <LarasAvatar size={32} className="mt-0.5" />
      )}
      <div className={cn("group min-w-0 max-w-[min(100%,40rem)]", isUser && "flex flex-col items-end")}>
        <p className="sr-only">{isUser ? "Anda" : "Laras"}</p>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 shadow-sm",
            isUser ? "rounded-tr-md bg-primary text-primary-foreground" : "rounded-tl-md border bg-card",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
          ) : streaming ? (
            <TypingChatMarkdown content={message.content} enabled onComplete={onTypingComplete} onTick={onTick} />
          ) : (
            <ChatMarkdown content={message.content} />
          )}
          {!isUser && !streaming && message.actions?.length ? <LarasActionCards actions={message.actions} /> : null}
        </div>
        {!isUser && !streaming ? (
          <button
            type="button"
            onClick={() => void copy()}
            className="mt-1 inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {copied ? <Check className="size-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
            {copied ? "Tersalin" : "Salin"}
            <span className="sr-only"> jawaban</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
