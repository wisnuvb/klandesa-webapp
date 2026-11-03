"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Circle, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/components/ui/utils";
import type { CompletenessItem } from "@/lib/dashboard/data-completeness";

const COLLAPSE_KEY = "dashboard-data-completeness-collapsed";

/**
 * Pengingat kelengkapan data dasar di dashboard. Berbeda dari /onboarding (one-time, bisa
 * di-skip permanen): banner ini tampil terus selama ada item belum lengkap, hanya bisa
 * diciutkan per sesi tab (sessionStorage), dan hilang sendiri begitu semua item selesai.
 */
export function DataCompletenessNotice({ items }: { items: CompletenessItem[] | null | undefined }) {
  const [collapsed, setCollapsed] = useState(
    () => typeof sessionStorage !== "undefined" && sessionStorage.getItem(COLLAPSE_KEY) === "1",
  );

  const onOpenChange = (open: boolean) => {
    setCollapsed(!open);
    sessionStorage.setItem(COLLAPSE_KEY, open ? "0" : "1");
  };

  if (!items) return null;
  const pending = items.filter((i) => !i.done);
  if (pending.length === 0) return null;

  return (
    <Collapsible
      open={!collapsed}
      onOpenChange={onOpenChange}
      role="status"
      className="rounded-lg border border-amber-200 bg-amber-50 text-amber-900"
    >
      <CollapsibleTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 p-4 text-left"
        >
          <ClipboardList aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">
            Kelengkapan data sistem — {items.length - pending.length} dari {items.length} selesai
          </span>
          <span className="text-xs font-normal text-amber-800">
            {collapsed ? "Lihat detail" : "Ciutkan"}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn("h-4 w-4 shrink-0 transition-transform", !collapsed && "rotate-180")}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <ul className="space-y-3 px-4 pb-4">
          {items.map((item) => (
            <li key={item.key} className="flex items-start gap-3 text-sm">
              {item.done ? (
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
              ) : (
                <Circle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("font-medium", item.done && "text-amber-900/70 line-through")}>
                  {item.label}
                </p>
                <p className="text-amber-800/90">{item.impact}</p>
              </div>
              {!item.done ? (
                <Button size="sm" variant="outline" className="shrink-0 bg-background/60" asChild>
                  <Link href={item.href}>{item.cta}</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CollapsibleContent>
    </Collapsible>
  );
}
