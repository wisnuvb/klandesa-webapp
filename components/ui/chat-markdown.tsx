"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import { normalizeChatMarkdown } from "@/lib/ai/normalize-markdown";
import { chatRemarkPlugins } from "@/lib/markdown/chat-plugins";
import { cn } from "./utils";

const markdownComponents: Components = {
  p: ({ children }) => (
    <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 last:mb-0 list-disc pl-5 space-y-1">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 last:mb-0 list-decimal pl-5 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-3 first:mt-0 text-base font-semibold">{children}</h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-3 first:mt-0 text-base font-semibold">{children}</h3>
  ),
  h3: ({ children }) => (
    <h4 className="mb-1.5 mt-2 first:mt-0 text-sm font-semibold">{children}</h4>
  ),
  strong: ({ children }) => <strong className="font-bold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-primary underline underline-offset-2"
    >
      {children}
    </a>
  ),
  code: ({ className, children }) => {
    const isBlock = className?.includes("language-");
    if (isBlock) {
      return (
        <code className="block overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs font-mono">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted px-1 py-0.5 text-[0.85em] font-mono">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 last:mb-0 overflow-x-auto rounded-md bg-muted p-3 text-xs">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-primary/40 pl-3 text-muted-foreground italic last:mb-0">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-2 last:mb-0 overflow-x-auto">
      <table className="w-full border-collapse text-left text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted/60 px-2 py-1 font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-2 py-1">{children}</td>
  ),
  hr: () => <hr className="my-3 border-border" />,
};

type ChatMarkdownProps = {
  content: string;
  className?: string;
};

/**
 * Render markdown chat via react-markdown + remark-gfm + remark-breaks.
 * normalizeChatMarkdown hanya lapisan kompatibilitas output LLM sebelum parse.
 */
export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  const normalized = normalizeChatMarkdown(content);

  return (
    <div className={cn("chat-markdown text-sm [&>*:first-child]:mt-0", className)}>
      <ReactMarkdown
        remarkPlugins={chatRemarkPlugins}
        components={markdownComponents}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
