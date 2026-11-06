"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountSearchPanel } from "@/components/admin/accounts/AccountSearchPanel";
import { ResidentSearchPanel } from "@/components/admin/accounts/ResidentSearchPanel";

export default function AdminAkunPage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Pusat Akun</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cari akun lintas desa dan lakukan intervensi aman untuk troubleshoot. Semua tindakan butuh konfirmasi sandi dan alasan, lalu tercatat di jejak audit.
        </p>
      </header>

      <Tabs defaultValue="akun">
        <TabsList>
          <TabsTrigger value="akun" className="min-h-8 px-4">Akun</TabsTrigger>
          <TabsTrigger value="warga" className="min-h-8 px-4">Warga (baca-saja)</TabsTrigger>
        </TabsList>
        <TabsContent value="akun" className="mt-4">
          <AccountSearchPanel />
        </TabsContent>
        <TabsContent value="warga" className="mt-4">
          <ResidentSearchPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
