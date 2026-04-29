"use client";

import Link from "next/link";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type Props = {
  showNewsShortcut: boolean;
  showProfileShortcut: boolean;
};

export const CmsContentShortcutsCard = memo(function CmsContentShortcutsCard({
  showNewsShortcut,
  showProfileShortcut,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Konten</CardTitle>
        <CardDescription>Pintasan modul terkait website</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {showNewsShortcut ? (
          <Button asChild variant="outline">
            <Link href="/pengumuman-desa">Berita / Pengumuman</Link>
          </Button>
        ) : null}
        {showProfileShortcut ? (
          <Button asChild variant="outline">
            <Link href="/pengaturan-desa">Profil & Kontak Desa</Link>
          </Button>
        ) : null}
        {!showNewsShortcut && !showProfileShortcut ? (
          <div className="text-muted-foreground text-sm">
            Tidak ada pintasan untuk capability saat ini.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
});
