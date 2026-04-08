"use client";

import { useRef } from "react";
import { X } from "lucide-react";
import { Badge } from "../ui/badge";
import { cn } from "../ui/utils";

export function SmartVariableInput({
  value,
  onChange,
  onFocus,
  placeholder,
  className,
  textarea = false,
  inputRef,
}: {
  value?: string | null;
  onChange: (val: string) => void;
  onFocus?: () => void;
  placeholder?: string;
  className?: string;
  textarea?: boolean;
  inputRef?: (el: HTMLInputElement | HTMLTextAreaElement | null) => void;
}) {
  const innerRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const safeValue = value ?? "";

  const parseValue = (text: string) => {
    const parts: {
      type: "text" | "variable";
      content: string;
      full?: string;
    }[] = [];
    const regex = /{([A-Z_0-9]+)}/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: "text",
          content: text.substring(lastIndex, match.index),
        });
      }
      parts.push({ type: "variable", content: match[1], full: match[0] });
      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text?.length) {
      parts.push({ type: "text", content: text.substring(lastIndex) });
    }

    return parts;
  };

  const handleRemoveVariable = (fullVar: string) => {
    const newValue = safeValue.replace(fullVar, "");
    onChange(newValue);
    innerRef.current?.focus();
  };

  const parts = parseValue(safeValue);

  return (
    <div
      className={cn(
        "relative min-h-10 w-full rounded-md border border-input bg-muted/10 px-3 py-2 text-sm ring-offset-background transition-all focus-within:ring-2 focus-within:ring-primary focus-within:border-primary focus-within:bg-background border-primary",
        className,
      )}
      onClick={() => innerRef.current?.focus()}
    >
      <div className="flex flex-wrap items-center gap-1.5 pointer-events-none relative z-20">
        {parts.map((part, idx) =>
          part.type === "variable" ? (
            <Badge
              key={idx}
              variant="secondary"
              className="pointer-events-auto flex items-center gap-1 bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 px-2 py-0.5 text-[11px] font-semibold transition-colors"
            >
              <span className="opacity-50 text-[10px]">{`{`}</span>
              {part.content}
              <span className="opacity-50 text-[10px]">{`}`}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveVariable(part.full!);
                }}
                className="ml-1 rounded-full p-0.5 hover:bg-primary/30 text-primary/70 hover:text-primary transition-colors"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ) : (
            <span key={idx} className="whitespace-pre-wrap text-foreground">
              {part.content}
            </span>
          ),
        )}
        {safeValue === "" && placeholder && (
          <span className="text-muted-foreground/60 italic">{placeholder}</span>
        )}
      </div>

      {textarea ? (
        <textarea
          ref={(el) => {
            innerRef.current = el;
            if (inputRef) inputRef(el);
          }}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className="absolute inset-0 w-full h-full text-transparent caret-primary cursor-text resize-none p-2 overflow-hidden z-10 bg-transparent outline-none border-none"
          placeholder={placeholder}
        />
      ) : (
        <input
          ref={(el) => {
            innerRef.current = el;
            if (inputRef) inputRef(el);
          }}
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          onFocus={onFocus}
          className="absolute inset-0 w-full h-full text-transparent caret-primary cursor-text p-2 z-10 bg-transparent outline-none border-none"
          placeholder={placeholder}
        />
      )}
    </div>
  );
}
