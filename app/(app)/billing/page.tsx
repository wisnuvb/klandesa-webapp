"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BILLING_CATALOG,
  formatIdr,
  getDesaPackageCharge,
  type DesaPackageTier,
} from "@/lib/billing/catalog";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Copy, Loader2 } from "lucide-react";

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

type CheckoutInvoice = {
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

type CheckoutResponse = {
  invoice: CheckoutInvoice;
};

type VaBank = { id: string; label: string; linkquBankCode: string };

function statusBadgeVariant(status: string) {
  const v = status.toLowerCase();
  if (v === "paid") return "default";
  if (v === "pending") return "secondary";
  if (v === "expired" || v === "failed" || v === "cancelled") return "destructive";
  return "outline";
}

type TierCardProps = {
  tier: DesaPackageTier;
  currentPlan: string | null;
  isActive: boolean;
  onOpenCheckout: (tier: DesaPackageTier) => void;
  checkoutLoading: boolean;
};

function TierCard({
  tier,
  currentPlan,
  isActive,
  onOpenCheckout,
  checkoutLoading,
}: TierCardProps) {
  const tierInfo = BILLING_CATALOG.desa_package.tiers[tier];
  const isCurrentPlan = currentPlan?.toLowerCase() === tier.toLowerCase();

  const isUpgrade = isActive && !isCurrentPlan;
  const needsSetupFee = !isActive || isUpgrade;

  const totalAmount =
    needsSetupFee && tierInfo.setupFee != null ? tierInfo.setupFee : tierInfo.annualFee;

  const actionLabel =
    isCurrentPlan && isActive ? "Perpanjang" : !isActive ? "Berlangganan" : "Upgrade";

  return (
    <div className="rounded-lg border p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="font-medium">{tierInfo.name}</div>
        {isCurrentPlan && <Badge variant="default">Aktif</Badge>}
      </div>
      <div className="text-sm text-muted-foreground">
        {!isActive ? (
          <>Biaya awal: {formatIdr(tierInfo.setupFee || 0)}</>
        ) : isUpgrade ? (
          <>Biaya upgrade: {formatIdr(tierInfo.setupFee || 0)}</>
        ) : (
          <>Tahunan: {formatIdr(tierInfo.annualFee)}</>
        )}
      </div>
      <div className="text-sm font-medium text-green-600">Total: {formatIdr(totalAmount)}</div>
      <Button
        onClick={() => onOpenCheckout(tier)}
        disabled={checkoutLoading}
        variant={isCurrentPlan ? "outline" : "default"}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

export default function Page() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingStatusResponse | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<CheckoutInvoice | null>(null);

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTier, setCheckoutTier] = useState<DesaPackageTier | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<"bank" | "payment">("bank");
  const [vaBanks, setVaBanks] = useState<VaBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState<string>("");
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);

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

  useEffect(() => {
    if (!checkoutOpen) return;
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      try {
        const res = await fetch("/api/billing/va-banks");
        const j = (await res.json().catch(() => null)) as
          | { banks?: VaBank[]; error?: string }
          | null;
        if (!res.ok) {
          throw new Error(j?.error || "Gagal memuat daftar bank");
        }
        if (!cancelled) setVaBanks(j?.banks ?? []);
      } catch (e) {
        if (!cancelled) {
          setCheckoutError(e instanceof Error ? e.message : "Gagal memuat daftar bank");
        }
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutOpen]);

  const chargePreview = useMemo(() => {
    if (!checkoutTier || !data) return null;
    return getDesaPackageCharge(checkoutTier, {
      subscriptionActive: data.subscription.active,
      currentPlan: data.subscription.plan,
    });
  }, [checkoutTier, data]);

  const openCheckout = (tier: DesaPackageTier) => {
    setCheckoutTier(tier);
    setCheckoutStep("bank");
    setSelectedBankCode("");
    setCheckoutError(null);
    setActiveInvoice(null);
    setCheckoutOpen(true);
  };

  const createDesaCheckout = async (tier: DesaPackageTier, bankCode: string) => {
    try {
      setCheckoutLoading(true);
      setCheckoutError(null);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: "desa_package",
          planCode: tier,
          paymentMethod: "va",
          bankCode,
        }),
      });

      const j = (await res.json().catch(() => null)) as
        | CheckoutResponse
        | { error?: string }
        | null;
      if (!res.ok) {
        throw new Error((j as { error?: string } | null)?.error || "Gagal membuat invoice");
      }

      const invoice = (j as CheckoutResponse).invoice;
      setActiveInvoice(invoice);
      setCheckoutStep("payment");
      await reload();
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Gagal membuat invoice");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const onConfirmBank = async () => {
    if (!checkoutTier) return;
    if (!selectedBankCode) {
      setCheckoutError("Pilih bank untuk virtual account.");
      return;
    }
    await createDesaCheckout(checkoutTier, selectedBankCode);
  };

  const refreshInvoiceStatus = useCallback(async (invoiceId: string) => {
    try {
      setStatusCheckLoading(true);
      setCheckoutError(null);
      const res = await fetch(`/api/billing/invoices/${invoiceId}`);
      const j = (await res.json().catch(() => null)) as
        | { invoice?: CheckoutInvoice; error?: string }
        | null;
      if (!res.ok) {
        throw new Error(j?.error || "Gagal memeriksa status");
      }
      if (j?.invoice) {
        setActiveInvoice(j.invoice);
        await reload();
      }
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Gagal memeriksa status");
    } finally {
      setStatusCheckLoading(false);
    }
  }, []);

  const pollInvoiceId = activeInvoice?.id;
  const pollInvoiceStatus = activeInvoice?.status;

  useEffect(() => {
    if (!checkoutOpen || checkoutStep !== "payment" || !pollInvoiceId) return;
    if (pollInvoiceStatus?.toLowerCase() !== "pending") return;

    const t = window.setInterval(() => {
      void refreshInvoiceStatus(pollInvoiceId);
    }, 8000);

    return () => window.clearInterval(t);
  }, [
    checkoutOpen,
    checkoutStep,
    pollInvoiceId,
    pollInvoiceStatus,
    refreshInvoiceStatus,
  ]);

  const bankLabelForInvoice = useMemo(() => {
    if (!activeInvoice?.bankCode) return null;
    const b = vaBanks.find((x) => x.linkquBankCode === activeInvoice.bankCode);
    return b?.label ?? `Bank (kode ${activeInvoice.bankCode})`;
  }, [activeInvoice?.bankCode, vaBanks]);

  const lastInvoice = useMemo(() => data?.invoices?.[0] ?? null, [data]);

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setCheckoutError("Tidak bisa menyalin ke clipboard");
    }
  };

  return (
    <div className="space-y-6">
      <Dialog
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) {
            setCheckoutTier(null);
            setCheckoutStep("bank");
            setSelectedBankCode("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {checkoutTier
                ? `Pembayaran — ${BILLING_CATALOG.desa_package.tiers[checkoutTier].name}`
                : "Pembayaran"}
            </DialogTitle>
            <DialogDescription>
              Pembayaran memakai Virtual Account Linkqu. Pilih bank tujuan transfer, lalu transfer
              sesuai nominal dan nomor VA.
            </DialogDescription>
          </DialogHeader>

          {chargePreview && checkoutStep === "bank" && (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <div className="text-muted-foreground">Total tagihan</div>
              <div className="text-lg font-semibold">{formatIdr(chargePreview.totalAmount)}</div>
            </div>
          )}

          {checkoutStep === "bank" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="va-bank">Bank virtual account</Label>
                <Select
                  value={selectedBankCode}
                  onValueChange={setSelectedBankCode}
                  disabled={banksLoading || checkoutLoading}
                >
                  <SelectTrigger id="va-bank" className="w-full">
                    <SelectValue
                      placeholder={banksLoading ? "Memuat bank…" : "Pilih bank"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {vaBanks.map((b) => (
                      <SelectItem key={b.id} value={b.linkquBankCode}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {checkoutError && <div className="text-sm text-red-600">{checkoutError}</div>}
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCheckoutOpen(false)}
                  disabled={checkoutLoading}
                >
                  Batal
                </Button>
                <Button type="button" onClick={() => void onConfirmBank()} disabled={checkoutLoading}>
                  {checkoutLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memproses…
                    </>
                  ) : (
                    "Buat virtual account"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {checkoutStep === "payment" && activeInvoice && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{activeInvoice.invoiceNumber}</span>
                <Badge variant={statusBadgeVariant(activeInvoice.status)}>
                  {activeInvoice.status}
                </Badge>
              </div>

              {activeInvoice.status.toLowerCase() === "paid" ? (
                <p className="text-sm text-green-700">Pembayaran diterima. Langganan akan diperbarui.</p>
              ) : (
                <>
                  {bankLabelForInvoice && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Bank: </span>
                      {bankLabelForInvoice}
                    </div>
                  )}
                  {activeInvoice.vaNumber && (
                    <div className="space-y-1">
                      <div className="text-sm text-muted-foreground">Nomor virtual account</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 text-base font-mono">
                          {activeInvoice.vaNumber}
                        </code>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => void copyText(activeInvoice.vaNumber!)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          Salin
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="text-sm">
                    <span className="text-muted-foreground">Nominal: </span>
                    <span className="font-semibold">{formatIdr(activeInvoice.amount)}</span>
                  </div>
                  {activeInvoice.expiresAt && (
                    <div className="text-xs text-muted-foreground">
                      Berlaku hingga: {new Date(activeInvoice.expiresAt).toLocaleString("id-ID")}
                    </div>
                  )}
                  {activeInvoice.paymentUrl && (
                    <a
                      href={activeInvoice.paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary underline"
                    >
                      Buka halaman pembayaran (jika ada)
                    </a>
                  )}
                </>
              )}

              {checkoutError && <div className="text-sm text-red-600">{checkoutError}</div>}

              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void refreshInvoiceStatus(activeInvoice.id)}
                  disabled={statusCheckLoading}
                >
                  {statusCheckLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Memeriksa…
                    </>
                  ) : (
                    "Cek status pembayaran"
                  )}
                </Button>
                <Button type="button" onClick={() => setCheckoutOpen(false)}>
                  Tutup
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
                <div className="text-sm">Absensi: {data.entitlements?.absensiTier ?? "-"}</div>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {(Object.keys(BILLING_CATALOG.desa_package.tiers) as DesaPackageTier[]).map(
              (tier) => (
                <TierCard
                  key={tier}
                  tier={tier}
                  currentPlan={data?.subscription.plan ?? null}
                  isActive={data?.subscription.active ?? false}
                  onOpenCheckout={openCheckout}
                  checkoutLoading={checkoutLoading}
                />
              ),
            )}
          </div>

          {checkoutError && !checkoutOpen && (
            <div className="text-sm text-red-600">{checkoutError}</div>
          )}

          {activeInvoice && !checkoutOpen && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-medium">{activeInvoice.invoiceNumber}</div>
                <Badge variant={statusBadgeVariant(activeInvoice.status)}>{activeInvoice.status}</Badge>
                <div className="text-sm text-muted-foreground">
                  Total: {formatIdr(activeInvoice.amount)}
                </div>
              </div>
              {activeInvoice.paymentMethod === "va" && activeInvoice.vaNumber && (
                <div className="text-sm space-y-1">
                  {bankLabelForInvoice && (
                    <div>
                      <span className="text-muted-foreground">Bank: </span>
                      {bankLabelForInvoice}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">VA:</span>
                    <code className="rounded bg-muted px-2 py-0.5 font-mono">
                      {activeInvoice.vaNumber}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      type="button"
                      onClick={() => void copyText(activeInvoice.vaNumber!)}
                    >
                      Salin VA
                    </Button>
                  </div>
                </div>
              )}
              {activeInvoice.qrImageUrl && (
                <div>
                  <Image
                    src={activeInvoice.qrImageUrl}
                    alt="QR pembayaran"
                    className="h-56 w-56 rounded-md border object-contain bg-white"
                    width={225}
                    height={225}
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
                    Buka link pembayaran
                  </a>
                </div>
              )}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={statusCheckLoading}
                onClick={() => void refreshInvoiceStatus(activeInvoice.id)}
              >
                {statusCheckLoading ? "Memeriksa…" : "Cek status pembayaran"}
              </Button>
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
