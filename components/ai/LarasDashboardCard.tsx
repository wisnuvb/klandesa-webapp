"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LarasAvatar } from "@/components/ai/LarasAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AI_ASSISTANT_NAME,
  AI_ASSISTANT_TAGLINE,
} from "@/lib/ai/persona";
import { buildAsistenAiHref } from "@/lib/ai/laras-access";

const DEFAULT_PROMPTS = [
  "Ringkas kondisi SDGs desa kami",
  "Draft visi-misi RPJMDes",
  "Cara mengajukan surat domisili",
] as const;

type LarasDashboardCardProps = {
  title?: string;
  tagline?: string;
  prompts?: readonly string[];
  mode?: string;
};

export function LarasDashboardCard({
  title = `${AI_ASSISTANT_NAME} — Asisten Desa AI`,
  tagline = AI_ASSISTANT_TAGLINE,
  prompts = DEFAULT_PROMPTS,
  mode,
}: LarasDashboardCardProps = {}) {
  return (
    <Card className="overflow-hidden border-teal-200/80 bg-gradient-to-br from-teal-50/90 via-background to-background">
      <CardContent className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4 min-w-0">
            <LarasAvatar size={56} className="shadow-md ring-2 ring-teal-100" />
            <div className="min-w-0 space-y-1">
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <p className="text-sm text-muted-foreground max-w-xl">{tagline}</p>
            </div>
          </div>
          <Button asChild className="shrink-0 gap-2">
            <Link href={buildAsistenAiHref({ mode })}>
              Mulai percakapan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {prompts.map((prompt) => (
            <Button
              key={prompt}
              variant="outline"
              size="sm"
              className="h-auto whitespace-normal text-left text-xs py-1.5 bg-background/80"
              asChild
            >
              <Link href={buildAsistenAiHref({ prompt, mode })}>{prompt}</Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export const LARAS_SDGS_PROMPTS = [
  "Goal SDGs mana yang paling perlu intervensi di desa kami?",
  "Ringkas kondisi SDGs desa dan 3 prioritas tindakan.",
  "Buat draf visi-misi RPJMDes 5 tahun selaras SDGs.",
] as const;
