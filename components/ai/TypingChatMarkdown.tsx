"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ui/chat-markdown";
import { cn } from "@/components/ui/utils";

type TypingChatMarkdownProps = {
  content: string;
  /** false = tampilkan langsung tanpa animasi (riwayat lama). */
  enabled?: boolean;
  onComplete?: () => void;
  onTick?: () => void;
  className?: string;
};

function charsPerTick(totalLength: number): number {
  if (totalLength <= 120) return 2;
  if (totalLength <= 400) return 4;
  if (totalLength <= 900) return 6;
  return 10;
}

function tickDelayMs(totalLength: number): number {
  if (totalLength <= 120) return 18;
  if (totalLength <= 400) return 14;
  return 10;
}

export function TypingChatMarkdown({
  content,
  enabled = true,
  onComplete,
  onTick,
  className,
}: TypingChatMarkdownProps) {
  const [visibleCount, setVisibleCount] = useState(enabled ? 0 : content.length);
  const [isTyping, setIsTyping] = useState(enabled);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const onTickRef = useRef(onTick);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onTickRef.current = onTick;
  }, [onComplete, onTick]);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    setVisibleCount(content.length);
    setIsTyping(false);
    onCompleteRef.current?.();
  }, [content.length]);

  useEffect(() => {
    completedRef.current = false;

    if (!enabled || !content) {
      queueMicrotask(() => {
        setVisibleCount(content.length);
        setIsTyping(false);
        if (enabled && !content) onCompleteRef.current?.();
      });
      return;
    }

    queueMicrotask(() => {
      setVisibleCount(0);
      setIsTyping(true);
    });

    const delay = tickDelayMs(content.length);
    const step = charsPerTick(content.length);
    let count = 0;

    const id = window.setInterval(() => {
      count = Math.min(content.length, count + step);
      setVisibleCount(count);
      onTickRef.current?.();

      if (count >= content.length) {
        window.clearInterval(id);
        finish();
      }
    }, delay);

    return () => window.clearInterval(id);
  }, [content, enabled, finish]);

  const skip = () => {
    if (!isTyping) return;
    finish();
  };

  const displayed = content.slice(0, visibleCount);

  return (
    <div
      className={cn(
        "relative",
        isTyping && "cursor-pointer",
        className,
      )}
      onClick={isTyping ? skip : undefined}
      onKeyDown={
        isTyping
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                skip();
              }
            }
          : undefined
      }
      role={isTyping ? "button" : undefined}
      tabIndex={isTyping ? 0 : undefined}
      title={isTyping ? "Ketuk untuk tampilkan semua" : undefined}
    >
      <ChatMarkdown content={displayed || (isTyping ? " " : "")} />
      {isTyping ? (
        <span
          className="inline-block w-0.5 h-[1.1em] align-text-bottom bg-primary/80 ml-0.5 animate-pulse"
          aria-hidden
        />
      ) : null}
    </div>
  );
}
