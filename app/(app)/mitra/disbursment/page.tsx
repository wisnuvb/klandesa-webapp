"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { Session } from "next-auth";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { formatIdr } from "@/lib/billing/catalog";
import { hasPartnerPortalAccess } from "@/lib/partner-session";

type DisbursementItem = {
  id: string;
  commissionEntry: {
    id: string;
    type: string;
    amount: string | number;
    villageId: number | null;
    description: string | null;
  };
};

type DisbursementRow = {
  id: string;
  partnerId: number;
  amount: string | number;
  currency: string;
  status: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  reference: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  items?: DisbursementItem[];
};



function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = status.toLowerCase();
  if (s === "paid") return "default";
  if (s === "processing") return "secondary";
  if (s === "failed") return "destructive";
  return "outline";
}

function formatDt(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export default function MitraDisbursementsPage() {
  const { data: session } = useSession();
  const portalOk = hasPartnerPortalAccess(session as Session | null);

  const [rows, setRows] = useState<DisbursementRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    const load = async () => {
      try {
        const res = await fetch("/api/partner/disbursements?limit=50", {
          cache: "no-store",
        });
        if (!on) return;
        if (res.ok) {
          const d = (await res.json()) as {
            disbursements?: DisbursementRow[];
          };
          setRows(d.disbursements ?? []);
        }
      } finally {
        if (on) setLoading(false);
      }
    };
    void load();
    return () => {
      on = false;
    };
  }, []);

  if (!portalOk) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Akun tidak valid</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Halaman ini hanya bagi pengguna dengan akses portal mitra (akun mitra atau desa tertaut referral).
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Disbursement</h1>
          <p className="text-sm text-muted-foreground">
            Riwayat transfer komisi oleh tim Klandesa ke rekening Anda.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/mitra/komisi">Revenue &amp; komisi</Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Batch payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-muted-foreground">Memuat…</div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Belum ada disbursement yang tercatat. Setelah komisi Anda di-approve
              dan dibayarkan, laporan pembayaran muncul di sini.
            </div>
          ) : (
            <div className="space-y-4">
              {rows.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-border p-4 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={statusBadgeVariant(d.status)}>
                          {d.status}
                        </Badge>
                        <span className="font-semibold text-lg">
                          {formatIdr(Number(d.amount ?? 0))}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Diajukan: {formatDt(d.createdAt)}
                        {d.paidAt ? ` · Dibayar: ${formatDt(d.paidAt)}` : ""}
                      </div>
                      {d.reference ? (
                        <div className="text-xs mt-1">
                          Referensi:{" "}
                          <span className="font-mono">{d.reference}</span>
                        </div>
                      ) : null}
                      {d.notes ? (
                        <div className="text-xs text-muted-foreground mt-2">
                          {d.notes}
                        </div>
                      ) : null}
                    </div>
                    <div className="rounded-md bg-muted/50 p-3 text-sm min-w-[220px]">
                      <div className="text-xs text-muted-foreground mb-1">
                        Rekening tujuan
                      </div>
                      <div className="font-medium">{d.bankName}</div>
                      <div>{d.accountNumber}</div>
                      <div className="text-muted-foreground">{d.accountName}</div>
                    </div>
                  </div>

                  {d.items && d.items.length > 0 ? (
                    <details className="text-sm">
                      <summary className="cursor-pointer select-none text-muted-foreground hover:text-foreground">
                        {d.items.length} entri komisi
                      </summary>
                      <ul className="mt-2 space-y-1 border-t pt-2">
                        {d.items.map((it) => (
                          <li
                            key={it.id}
                            className="flex flex-wrap justify-between gap-2 border-b border-dashed pb-1 last:border-0"
                          >
                            <span>
                              [{it.commissionEntry.type}]{" "}
                              {it.commissionEntry.description || "Komisi"}
                            </span>
                            <span>{formatIdr(Number(it.commissionEntry.amount ?? 0))}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
