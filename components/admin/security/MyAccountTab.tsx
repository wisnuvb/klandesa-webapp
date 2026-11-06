"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiJson, formatWib } from "./api";
import { ChangePasswordCard } from "./ChangePasswordCard";
import { TwoFactorCard, type SecurityStatus } from "./TwoFactorCard";

export function MyAccountTab() {
  const [status, setStatus] = useState<SecurityStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reloadKey, setReloadKey] = useState(0);
  const load = useCallback(() => setReloadKey((k) => k + 1), []);
  useEffect(() => {
    let alive = true;
    apiJson<SecurityStatus>("/api/admin/security/status")
      .then((r) => {
        if (!alive) return;
        setStatus(r);
        setError(null);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Gagal memuat status keamanan."));
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  if (error) {
    return (
      <Card>
        <CardContent className="space-y-3 pt-6">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              setError(null);
              load();
            }}
          >
            Coba lagi
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (!status) {
    return (
      <div className="space-y-4" aria-busy="true" aria-label="Memuat status keamanan">
        {[0, 1].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-56" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Masuk sebagai <span className="font-medium text-foreground">{status.email}</span>
        {status.lastLogin ? <> · login terakhir {formatWib(status.lastLogin)}</> : null}
      </p>
      <TwoFactorCard status={status} onChanged={load} />
      <ChangePasswordCard totpEnabled={status.totpEnabled} />
    </div>
  );
}
