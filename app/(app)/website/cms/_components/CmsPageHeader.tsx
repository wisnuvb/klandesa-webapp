"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  templateName: string;
  templateKey: string;
  capabilities: string[];
};

export function CmsPageHeader({ templateName, templateKey, capabilities }: Props) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="text-2xl font-semibold">CMS Website</div>
        <div className="text-muted-foreground space-y-1 text-sm">
          <div>
            Template: <span className="text-foreground font-medium">{templateName}</span>
            {templateKey ? (
              <span className="text-muted-foreground"> ({templateKey})</span>
            ) : null}
          </div>
          {capabilities.length ? (
            <div className="text-xs">
              Capability: {capabilities.slice(0, 8).join(", ")}
              {capabilities.length > 8 ? "…" : ""}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link href="/website">Kembali</Link>
        </Button>
        <Button asChild variant="outline">
          <a href="/" target="_blank" rel="noreferrer">
            Preview <ExternalLink className="size-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
