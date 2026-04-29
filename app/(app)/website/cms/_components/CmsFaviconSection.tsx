"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DigitalArchivePickerModal } from "@/components/digital-archive/DigitalArchivePickerModal";

type Props = {
  faviconUrl: string;
  onFaviconUrlChange: (v: string) => void;
  disabled?: boolean;
};

export function CmsFaviconSection({
  faviconUrl,
  onFaviconUrlChange,
  disabled,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Favicon situs</CardTitle>
          <CardDescription>
            Satu ikon untuk seluruh situs (tab browser &amp; pintasan). URL gambar
            publik (mis. .ico, .png); tidak perlu diisi per halaman.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid max-w-2xl gap-2">
          <div className="text-xs text-muted-foreground">URL favicon</div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              value={faviconUrl}
              onChange={(e) => onFaviconUrlChange(e.target.value)}
              placeholder="https://… atau pilih dari arsip"
              disabled={disabled}
              className="min-w-0 flex-1"
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0"
              onClick={() => setPickerOpen(true)}
              disabled={disabled}
            >
              Jelajahi arsip
            </Button>
          </div>
        </CardContent>
      </Card>

      <DigitalArchivePickerModal
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={onFaviconUrlChange}
        title="Pilih favicon dari arsip digital"
        description="Cari judul atau nama berkas, saring kategori (tepat), lalu pilih satu gambar. Mendukung halaman (pagination)."
      />
    </>
  );
}
