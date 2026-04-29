"use client";

import { memo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WebsiteCMSPage } from "@/lib/website-engine/types";
import { sanitizePageSlug } from "@/lib/website-engine/resolved-structure";

type Props = {
  activePage: WebsiteCMSPage;
  saving: boolean;
  slugConflictMessage: string | null;
  onPatchPage: (fn: (p: WebsiteCMSPage) => WebsiteCMSPage) => void;
};

export const CmsActivePageFields = memo(function CmsActivePageFields({
  activePage,
  saving,
  slugConflictMessage,
  onPatchPage,
}: Props) {
  return (
    <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
      <div className="grid gap-2">
        <div className="text-xs text-muted-foreground">Judul halaman</div>
        <Input
          value={activePage.title}
          onChange={(e) =>
            onPatchPage((p) => ({ ...p, title: e.target.value }))
          }
          disabled={saving}
        />
      </div>
      <div className="grid gap-2">
        <div className="text-xs text-muted-foreground">
          Slug URL{" "}
          <span className="text-muted-foreground/80">
            (kosong = beranda; hanya satu halaman boleh kosong)
          </span>
        </div>
        <Input
          value={activePage.slug}
          onChange={(e) => {
            const raw = e.target.value;
            onPatchPage((p) => ({ ...p, slug: sanitizePageSlug(raw) }));
          }}
          disabled={saving}
          placeholder="Kosongkan untuk beranda, atau mis. tentang-kami"
        />
        {slugConflictMessage ? (
          <p className="text-xs text-red-600 dark:text-red-400">
            {slugConflictMessage}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 md:col-span-2">
        <div className="text-xs text-muted-foreground">
          Layout preset (opsional)
        </div>
        <select
          className="h-9 max-w-xs rounded-md border bg-background px-3 text-sm"
          value={activePage.layoutPreset ?? ""}
          onChange={(e) =>
            onPatchPage((p) => ({
              ...p,
              layoutPreset: e.target.value || undefined,
            }))
          }
          disabled={saving}
        >
          <option value="">Default (container)</option>
          <option value="fullBleed">Lebar penuh</option>
        </select>
      </div>
      <div className="mt-1 grid gap-3 border-t pt-3 md:col-span-2">
        <div className="text-sm font-medium">SEO untuk halaman ini</div>
        <p className="text-xs text-muted-foreground">
          {activePage.slug === ""
            ? "Untuk beranda, ini dipakai juga sebagai SEO default situs ( judul / deskripsi / gambar dibagikan)."
            : "Metadata untuk halaman ini di hasil pencarian dan saat dibagikan."}
        </p>
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <div className="text-xs text-muted-foreground">
              Judul meta (opsional)
            </div>
            <Input
              value={activePage.seo?.title ?? ""}
              onChange={(e) =>
                onPatchPage((p) => ({
                  ...p,
                  seo: { ...p.seo, title: e.target.value },
                }))
              }
              placeholder={
                activePage.slug === ""
                  ? "Di kosongkan → dapat nama desa + template"
                  : "Default: judul halaman"
              }
              disabled={saving}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">
              Deskripsi meta
            </div>
            <Textarea
              rows={3}
              value={activePage.seo?.description ?? ""}
              onChange={(e) =>
                onPatchPage((p) => ({
                  ...p,
                  seo: { ...p.seo, description: e.target.value },
                }))
              }
              placeholder="Ringkasan singkat untuk mesin pencari"
              disabled={saving}
            />
          </div>
          <div className="grid gap-2 md:col-span-2">
            <div className="text-xs text-muted-foreground">
              URL gambar Open Graph
            </div>
            <Input
              value={activePage.seo?.ogImageUrl ?? ""}
              onChange={(e) =>
                onPatchPage((p) => ({
                  ...p,
                  seo: { ...p.seo, ogImageUrl: e.target.value },
                }))
              }
              placeholder="https://…"
              disabled={saving}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
