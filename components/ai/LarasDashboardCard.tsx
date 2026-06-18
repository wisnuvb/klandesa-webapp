"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { LarasAvatar } from "@/components/ai/LarasAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AI_ASSISTANT_NAME,
  AI_ASSISTANT_TAGLINE,
} from "@/lib/ai/persona";
import { SELECTABLE_AI_MODELS } from "@/lib/ai/models";

const QUICK_PROMPTS = [
  "Ringkas kondisi SDGs desa kami",
  "Draft visi-misi RPJMDes",
  "Cara mengajukan surat domisili",
] as const;

export function LarasDashboardCard() {
  const modelCount = SELECTABLE_AI_MODELS.length;

  return (
    <Card className="overflow-hidden border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-background to-background">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 min-w-0">
            <LarasAvatar size={56} className="shadow-md ring-2 ring-teal-100" />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  {AI_ASSISTANT_NAME} — Asisten Desa AI
                </h2>
                {/* <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                  <Sparkles className="h-3 w-3" />
                  {modelCount} model gratis
                </span> */}
              </div>
              <p className="text-sm text-muted-foreground max-w-xl">
                {AI_ASSISTANT_TAGLINE}
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link href="/asisten-ai">
              Mulai percakapan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal text-left text-xs py-1.5 bg-background/80"
              asChild
            >
              <Link
                href={`/asisten-ai?prompt=${encodeURIComponent(prompt)}`}
              >
                {prompt}
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
