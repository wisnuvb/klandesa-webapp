"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";

type BillingStatusResponse = {
  village: { id: number; code: string; name: string };
  subscription: {
    active: boolean;
    plan: string | null;
    status: string | null;
    startDate: string | null;
    expiry: string | null;
  };
  entitlements:
    | {
        desaTier: string;
        absensiTier: string;
        arsipTier: string;
        arsipStorageLimitGb: number;
      }
    | null;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    productType: string;
    planCode: string;
    amount: number;
    status: string;
    paymentMethod: string | null;
    paymentUrl: string | null;
    qrContent: string | null;
    qrImageUrl: string | null;
    vaNumber: string | null;
    bankCode: string | null;
    createdAt: string;
    expiresAt: string | null;
    paidAt: string | null;
  }>;
};

type CheckoutResponse = {
  invoice: {
    id: string;
    invoiceNumber: string;
    productType: string;
    planCode: string;
    amount: number;
    status: string;
    expiresAt: string | null;
    paymentMethod: string | null;
    paymentUrl: string | null;
    qrContent: string | null;
    qrImageUrl: string | null;
    vaNumber: string | null;
    bankCode: string | null;
    createdAt: string;
    items: Array<{
      id: string;
      name: string;
      quantity: number;
      unitAmount: number;
      totalAmount: number;
    }>;
  };
};

function statusBadgeVariant(status: string) {
  const v = status.toLowerCase();
  if (v === "paid") return "default";
  if (v === "pending") return "secondary";
  if (v === "expired" || v === "failed" || v === "cancelled") return "destructive";
  return "outline";
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingStatusResponse | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<CheckoutResponse["invoice"] | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/billing/status");
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || "Gagal memuat billing");
      }
      const j = (await res.json()) as BillingStatusResponse;
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat billing");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const lastInvoice = useMemo(() => {
    return data?.invoices?.[0] ?? null;
  }, [data]);

  const createDesaCheckout = async (tier: "starter" | "profesional") => {
    try {
      setCheckoutLoading(true);
      setCheckoutError(null);
      setActiveInvoice(null);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "desa_package",
          planCode: tier,
          paymentMethod: "qris",
        }),
      });

      const j = (await res.json().catch(() => null)) as CheckoutResponse | { error?: string } | null;
      if (!res.ok) {
        throw new Error((j as { error?: string } | null)?.error || "Gagal membuat invoice");
      }

      const invoice = (j as CheckoutResponse).invoice;
      setActiveInvoice(invoice);
      await reload();
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Gagal membuat invoice");
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Langganan</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && <div className="text-sm text-muted-foreground">Memuat...</div>}
          {!loading && error && <div className="text-sm text-red-600">{error}</div>}
          {!loading && !error && data && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Desa</div>
                <div className="font-medium">{data.village.name}</div>
                <div className="text-sm text-muted-foreground">{data.village.code}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Paket Desa</div>
                <div className="flex items-center gap-2">
                  <div className="font-medium">{data.subscription.plan ?? "-"}</div>
                  <Badge variant={data.subscription.active ? "default" : "secondary"}>
                    {data.subscription.active ? "Aktif" : "Tidak Aktif"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Expiry: {data.subscription.expiry ?? "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Bundle</div>
                <div className="text-sm">
                  Absensi: {data.entitlements?.absensiTier ?? "-"}
                </div>
                <div className="text-sm">
                  Arsip: {data.entitlements?.arsipTier ?? "-"} (
                  {data.entitlements?.arsipStorageLimitGb ?? 0} GB)
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pembelian Paket Desa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="font-medium">Starter</div>
              <div className="text-sm text-muted-foreground">
                Biaya awal: {formatIdr(BILLING_CATALOG.desa_package.tiers.starter.setupFee)} •
                Tahunan: {formatIdr(BILLING_CATALOG.desa_package.tiers.starter.annualFee)}
              </div>
              <Button
                onClick={() => void createDesaCheckout("starter")}
                disabled={checkoutLoading}
              >
                Buat Invoice (QRIS)
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="font-medium">Profesional</div>
              <div className="text-sm text-muted-foreground">
                Biaya awal: {formatIdr(BILLING_CATALOG.desa_package.tiers.profesional.setupFee)} •
                Tahunan: {formatIdr(BILLING_CATALOG.desa_package.tiers.profesional.annualFee)}
              </div>
              <Button
                onClick={() => void createDesaCheckout("profesional")}
                disabled={checkoutLoading}
              >
                Buat Invoice (QRIS)
              </Button>
            </div>
          </div>

          {checkoutError && <div className="text-sm text-red-600">{checkoutError}</div>}

          {activeInvoice && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{activeInvoice.invoiceNumber}</div>
                <Badge variant={statusBadgeVariant(activeInvoice.status)}>
                  {activeInvoice.status}
                </Badge>
                <div className="text-sm text-muted-foreground">
                  Total: {formatIdr(activeInvoice.amount)}
                </div>
              </div>

              {activeInvoice.qrImageUrl && (
                <div>
                  <img
                    src={activeInvoice.qrImageUrl}
                    alt="QRIS"
                    className="h-56 w-56 rounded-md border object-contain bg-white"
                  />
                </div>
              )}

              {!activeInvoice.qrImageUrl && activeInvoice.qrContent && (
                <div className="text-sm break-all">{activeInvoice.qrContent}</div>
              )}

              {activeInvoice.paymentUrl && (
                <div className="text-sm">
                  <a
                    href={activeInvoice.paymentUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    Buka Link Pembayaran
                  </a>
                </div>
              )}
            </div>
          )}

          {lastInvoice && !activeInvoice && (
            <div className="text-sm text-muted-foreground">
              Invoice terakhir: {lastInvoice.invoiceNumber} ({lastInvoice.status})
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          {data?.invoices?.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3">Invoice</th>
                    <th className="py-2 pr-3">Produk</th>
                    <th className="py-2 pr-3">Paket</th>
                    <th className="py-2 pr-3">Total</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Dibuat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoices.map((inv) => (
                    <tr key={inv.id} className="border-b">
                      <td className="py-2 pr-3 font-medium">{inv.invoiceNumber}</td>
                      <td className="py-2 pr-3">{inv.productType}</td>
                      <td className="py-2 pr-3">{inv.planCode}</td>
                      <td className="py-2 pr-3">{formatIdr(inv.amount)}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={statusBadgeVariant(inv.status)}>{inv.status}</Badge>
                      </td>
                      <td className="py-2 pr-3">{inv.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Belum ada invoice</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

