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
        <Button asChild variant="outline">
          <Link href="/bantuan-program-keluarga">
            Bantuan & program keluarga (data desa)
          </Link>
        </Button>
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
      </CardContent>
    </Card>
  );
});
