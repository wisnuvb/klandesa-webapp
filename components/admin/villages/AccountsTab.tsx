"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionShell } from "./SectionShell";
import { useInspectSection } from "./use-section";
import { ROLE_LABEL, fmtDateTime } from "./types";

type UsersResp = {
  total: number; truncated: boolean;
  users: { id: number; name: string; emailMasked: string; role: string; isActive: boolean; lastLogin: string | null; createdAt: string }[];
};

export function AccountsTab({ villageId }: { villageId: number }) {
  const s = useInspectSection<UsersResp>(villageId, "users");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Email disamarkan. Tindakan pada akun (reset, nonaktifkan) dilakukan di Pusat Akun.</p>
        <Button asChild variant="outline" className="min-h-10">
          <Link href={`/admin/akun?villageId=${villageId}`}><ExternalLink aria-hidden="true" /> Buka di Pusat Akun</Link>
        </Button>
      </div>
      <SectionShell loading={s.loading} error={s.error} onRetry={s.reload} empty={s.data?.users.length === 0} emptyText="Desa belum memiliki pengguna.">
        {s.data ? (
          <>
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Daftar pengguna desa">
              <table className="w-full min-w-[620px] text-sm">
                <caption className="sr-only">Pengguna desa</caption>
                <thead>
                  <tr className="border-b text-left">
                    <th scope="col" className="py-2 pr-3 font-medium">Nama</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Email</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Peran</th>
                    <th scope="col" className="py-2 pr-3 font-medium">Status</th>
                    <th scope="col" className="py-2 font-medium">Masuk terakhir</th>
                  </tr>
                </thead>
                <tbody>
                  {s.data.users.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="py-2 pr-3 font-medium [overflow-wrap:anywhere]">{u.name}</td>
                      <td className="py-2 pr-3 font-mono text-xs [overflow-wrap:anywhere]">{u.emailMasked}</td>
                      <td className="py-2 pr-3">{ROLE_LABEL[u.role] ?? u.role}</td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline" className={u.isActive ? "" : "border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"}>
                          {u.isActive ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </td>
                      <td className="py-2 tabular-nums">{u.lastLogin ? fmtDateTime(u.lastLogin) : "Belum pernah"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {s.data.truncated ? (
              <p className="text-xs text-muted-foreground">Menampilkan {s.data.users.length} dari {s.data.total} pengguna. Cari selebihnya di Pusat Akun.</p>
            ) : null}
          </>
        ) : null}
      </SectionShell>
    </div>
  );
}
