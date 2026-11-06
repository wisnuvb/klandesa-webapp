"use client";

import { ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminsTab } from "./AdminsTab";
import { MyAccountTab } from "./MyAccountTab";

export function SecurityConsole() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          Keamanan
        </h1>
        <p className="text-sm text-muted-foreground">Amankan akun Anda dan kelola siapa saja yang boleh mengelola platform.</p>
      </header>
      <Tabs defaultValue="akun" className="space-y-4">
        <TabsList>
          <TabsTrigger value="akun" className="min-h-9">
            Akun saya
          </TabsTrigger>
          <TabsTrigger value="admin" className="min-h-9">
            Admin platform
          </TabsTrigger>
        </TabsList>
        <TabsContent value="akun">
          <MyAccountTab />
        </TabsContent>
        <TabsContent value="admin">
          <AdminsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
