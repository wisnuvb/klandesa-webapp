"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  FileText,
  Globe,
  Settings,
  Server,
  Shield,
  X,
} from "lucide-react";
import { SearchBar } from "./components/SearchBar";
import { TemplateCard } from "./components/TemplateCard";
import { StatsCard } from "./components/StatsCard";
import { WebsiteDomainsPanel } from "./components/WebsiteDomainsPanel";
import type { ActiveWebsite, WebsiteTemplate } from "./types";
import { formatCurrency, getBadgeColor, getDaysUntilExpiration } from "./utils";

type WebsiteOverviewResponse = {
  village: { id: number; code: string; name: string };
  templates: WebsiteTemplate[];
  activeWebsite: ActiveWebsite | null;
  db?: { ok: boolean };
};

type VaBank = { id: string; label: string; linkquBankCode: string };

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

export default function WebsitePage() {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [village, setVillage] = useState<{
    id: number;
    code: string;
    name: string;
  } | null>(null);
  const [templates, setTemplates] = useState<WebsiteTemplate[]>([]);
  const [activeWebsite, setActiveWebsite] = useState<ActiveWebsite | null>(
    null,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<WebsiteTemplate | null>(null);
  const [previewImageIndex, setPreviewImageIndex] = useState(0);
  const reloadOverview = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/website/overview", { cache: "no-store" });
      const json = (await res.json()) as Partial<WebsiteOverviewResponse> & {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(json.error || "Gagal memuat data website");
      }
      setVillage(json.village ?? null);
      setTemplates(Array.isArray(json.templates) ? json.templates : []);
      setActiveWebsite(json.activeWebsite ?? null);
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await reloadOverview();
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadOverview]);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q),
    );
  }, [templates, searchQuery]);

  const handlePreview = (template: WebsiteTemplate) => {
    setSelectedTemplate(template);
    setPreviewImageIndex(0);
    setShowPreviewModal(true);
  };

  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTemplate, setCheckoutTemplate] =
    useState<WebsiteTemplate | null>(null);
  const [checkoutMode, setCheckoutMode] = useState<"new" | "change">("new");
  const [checkoutStep, setCheckoutStep] = useState<
    "domain" | "warning" | "bank" | "payment"
  >("domain");
  const [domainType, setDomainType] = useState<"subdomain" | "custom">(
    "subdomain",
  );
  const [domainValue, setDomainValue] = useState("");
  const [domainError, setDomainError] = useState<string | null>(null);
  const [warningAccepted, setWarningAccepted] = useState(false);

  const [vaBanks, setVaBanks] = useState<VaBank[]>([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBankId, setSelectedBankId] = useState("");

  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<CheckoutInvoice | null>(
    null,
  );
  const [statusCheckLoading, setStatusCheckLoading] = useState(false);

  const openCheckout = (template: WebsiteTemplate) => {
    const mode = activeWebsite ? "change" : "new";
    setCheckoutMode(mode);
    setCheckoutTemplate(template);
    setCheckoutError(null);
    setActiveInvoice(null);
    setSelectedBankId("");
    setDomainError(null);
    setWarningAccepted(false);

    if (mode === "new") {
      setCheckoutStep("domain");
      setDomainType("subdomain");
      const fallback = village?.code ? village.code.toLowerCase() : "desa";
      setDomainValue(fallback);
    } else {
      setCheckoutStep("warning");
      setDomainValue("");
    }

    setCheckoutOpen(true);
  };

  const closeCheckout = () => {
    setCheckoutOpen(false);
    setCheckoutTemplate(null);
    setActiveInvoice(null);
    setCheckoutError(null);
    setCheckoutLoading(false);
    setSelectedBankId("");
    setDomainError(null);
    setWarningAccepted(false);
  };

  const handleChooseTemplate = (template: WebsiteTemplate) => {
    setShowPreviewModal(false);
    openCheckout(template);
  };

  useEffect(() => {
    if (!checkoutOpen) return;
    let cancelled = false;
    (async () => {
      setBanksLoading(true);
      setCheckoutError(null);
      try {
        const res = await fetch("/api/billing/va-banks");
        const j = (await res.json().catch(() => null)) as {
          banks?: VaBank[];
          error?: string;
        } | null;
        if (!res.ok) throw new Error(j?.error || "Gagal memuat daftar bank");
        if (!cancelled) setVaBanks(j?.banks ?? []);
      } catch (e) {
        if (!cancelled)
          setCheckoutError(
            e instanceof Error ? e.message : "Gagal memuat bank",
          );
      } finally {
        if (!cancelled) setBanksLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [checkoutOpen]);

  const proration = useMemo(() => {
    if (!activeWebsite || !checkoutTemplate) return null;
    const currentTemplate =
      templates.find((t) => t.id === activeWebsite.template_id) ?? null;
    if (!currentTemplate) return null;
    const now = new Date();
    const expiry = new Date(activeWebsite.expires_at);
    const remainingMs = expiry.getTime() - now.getTime();
    const remainingDays = Math.max(
      0,
      Math.ceil(remainingMs / (1000 * 60 * 60 * 24)),
    );
    const credit = Math.round((remainingDays / 365) * currentTemplate.price);
    const payableEstimate = Math.max(
      0,
      Math.round(checkoutTemplate.price - credit),
    );
    return {
      currentTemplate,
      remainingDays,
      credit,
      payableEstimate,
    };
  }, [activeWebsite, checkoutTemplate, templates]);

  const validateDomain = () => {
    if (checkoutMode !== "new") return true;
    const v = domainValue.trim().toLowerCase();
    if (domainType === "subdomain") {
      if (!/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/.test(v)) {
        setDomainError("Subdomain tidak valid");
        return false;
      }
      if (v === "app") {
        setDomainError("Subdomain tidak valid");
        return false;
      }
      setDomainError(null);
      return true;
    }

    if (!/^(?=.{4,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/.test(v)) {
      setDomainError("Custom domain tidak valid");
      return false;
    }
    setDomainError(null);
    return true;
  };

  const proceedCheckout = async () => {
    if (!checkoutTemplate) return;

    if (checkoutStep === "domain") {
      if (!validateDomain()) return;
      setCheckoutStep("bank");
      return;
    }

    if (checkoutStep === "warning") {
      if (!warningAccepted) {
        setCheckoutError("Harap setujui peringatan terlebih dahulu");
        return;
      }
      setCheckoutError(null);
      setCheckoutStep("bank");
      return;
    }

    if (checkoutStep === "bank") {
      if (!selectedBankId) {
        setCheckoutError("Pilih bank terlebih dahulu");
        return;
      }
      setCheckoutLoading(true);
      setCheckoutError(null);
      try {
        const metadata = {
          website: {
            mode: checkoutMode,
            domainType: checkoutMode === "new" ? domainType : undefined,
            domain:
              checkoutMode === "new"
                ? domainValue.trim().toLowerCase()
                : undefined,
            currentTemplateId: activeWebsite?.template_id,
            currentExpiry: activeWebsite?.expires_at,
          },
        };

        const res = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productType: "website",
            planCode: String(checkoutTemplate.id),
            paymentMethod: "va",
            bankChannelId: selectedBankId,
            metadata,
          }),
        });

        const j = (await res.json().catch(() => null)) as {
          invoice?: CheckoutInvoice;
          error?: string;
        } | null;
        if (!res.ok) throw new Error(j?.error || "Gagal membuat checkout");
        if (!j?.invoice) throw new Error("Invoice tidak ditemukan");
        setActiveInvoice(j.invoice);
        setCheckoutStep("payment");
      } catch (e) {
        setCheckoutError(
          e instanceof Error ? e.message : "Gagal membuat checkout",
        );
      } finally {
        setCheckoutLoading(false);
      }
      return;
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-999999px";
      textarea.style.top = "-999999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
  };

  const refreshInvoiceStatus = async () => {
    if (!activeInvoice) return;
    setStatusCheckLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch(`/api/billing/invoices/${activeInvoice.id}`);
      const j = (await res.json().catch(() => null)) as {
        invoice?: CheckoutInvoice;
        error?: string;
      } | null;
      if (!res.ok) throw new Error(j?.error || "Gagal cek status invoice");
      if (!j?.invoice) throw new Error("Invoice tidak ditemukan");
      setActiveInvoice(j.invoice);
      if (String(j.invoice.status).toLowerCase() === "paid") {
        closeCheckout();
        await reloadOverview();
      }
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Gagal cek status");
    } finally {
      setStatusCheckLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Website Desa</h1>
        <p className="text-gray-600">
          Kelola website desa Anda dan pilih template.
        </p>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {errorMessage}
        </div>
      )}

      {!loading && !activeWebsite ? (
        <div className="bg-linear-to-r from-orange-50 to-red-50 border-l-4 border-orange-500 rounded-lg p-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-orange-900 mb-1">
                Website Anda Belum Aktif
              </h3>
              <p className="text-sm text-orange-800">
                Pilih template website yang sesuai dengan kebutuhan desa Anda.
                Website akan aktif setelah pembayaran diverifikasi.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && activeWebsite ? (
        <div className="space-y-6">
          <div className="bg-linear-to-br from-teal-600 to-teal-700 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="flex items-center gap-3">
                <Globe className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">
                    {activeWebsite.custom_domain ?? activeWebsite.domain}
                  </h2>
                  <p className="text-teal-100">
                    Template: {activeWebsite.template_name}
                  </p>
                  <p className="text-sm text-teal-100 mt-1">
                    Berakhir dalam{" "}
                    {getDaysUntilExpiration(activeWebsite.expires_at)} hari
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <a
                  href={`https://${activeWebsite.custom_domain ?? activeWebsite.domain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-white text-teal-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
                >
                  Lihat Website
                </a>
                <Link
                  href="/website/cms"
                  className="px-6 py-3 bg-teal-500/20 text-white rounded-xl font-medium hover:bg-teal-500/30 transition-colors border border-white/25"
                >
                  Masuk CMS
                </Link>
              </div>
            </div>
          </div>

          <WebsiteDomainsPanel villageCode={village?.code ?? ""} />

          <div className="grid md:grid-cols-4 gap-6">
            <StatsCard
              title="Total Pengunjung"
              value={activeWebsite.total_visitors.toLocaleString()}
              icon="visitors"
            />
            <StatsCard
              title="Pengunjung Hari Ini"
              value={activeWebsite.visitors_today.toLocaleString()}
              icon="views"
            />
            <StatsCard
              title="Pengunjung Bulan Ini"
              value={activeWebsite.visitors_month.toLocaleString()}
              icon="engagement"
            />
            <StatsCard
              title="Total Konten"
              value={activeWebsite.total_posts}
              icon="posts"
            />
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  CMS Website
                </div>
                <div className="text-sm text-gray-600">
                  Kelola konten & informasi yang tampil di website.
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link
                  href="/website/cms"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  <FileText className="w-4 h-4" />
                  Kelola Berita
                </Link>
                <Link
                  href="/pengaturan-desa"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4" />
                  Pengaturan Desa
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Pilih Template Website
            </h2>
            <p className="text-gray-600 text-sm">
              Template diambil langsung dari database.
            </p>
          </div>
          <div className="w-full sm:w-80">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Cari..."
            />
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-gray-600">Memuat data...</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onPreview={handlePreview}
                onChoose={handleChooseTemplate}
              />
            ))}
          </div>
        )}

        {!loading && filteredTemplates.length === 0 ? (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Template tidak ditemukan
            </h3>
            <p className="text-gray-600">
              Coba kata kunci pencarian yang berbeda
            </p>
          </div>
        ) : null}
      </div>

      {showPreviewModal && selectedTemplate ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-gray-900">
                    {selectedTemplate.name}
                  </h3>
                  {selectedTemplate.is_premium ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                      <Crown className="w-3.5 h-3.5" />
                      Premium
                    </span>
                  ) : null}
                  {selectedTemplate.badge ? (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium border ${getBadgeColor(
                        selectedTemplate.badge,
                      )}`}
                    >
                      {selectedTemplate.badge}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedTemplate.description}
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 space-y-4">
                  <div className="relative w-full h-72 sm:h-105 bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
                    <Image
                      src={
                        selectedTemplate.preview_images[previewImageIndex] ||
                        selectedTemplate.preview_images[0]
                      }
                      alt={selectedTemplate.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {selectedTemplate.preview_images.length > 1 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {selectedTemplate.preview_images.map((src, idx) => {
                        const isActive = idx === previewImageIndex;
                        return (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setPreviewImageIndex(idx)}
                            className={`relative w-full h-20 rounded-lg overflow-hidden border transition-colors ${
                              isActive
                                ? "border-teal-600 ring-2 ring-teal-200"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <Image
                              src={src}
                              alt={`${selectedTemplate.name} ${idx + 1}`}
                              fill
                              className="object-cover"
                            />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                <div className="lg:col-span-2 space-y-6">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Harga</div>
                    <div className="text-2xl font-bold text-teal-700">
                      {formatCurrency(selectedTemplate.price)}
                    </div>
                    <div className="text-sm text-gray-500">per tahun</div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                    <div className="font-semibold text-gray-900">Termasuk</div>
                    <div className="space-y-2 text-sm text-gray-700">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-600" />
                        <span>Pembayaran tahunan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Server className="w-4 h-4 text-teal-600" />
                        <span>Free hosting</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-teal-600" />
                        <span>Free SSL</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="font-semibold text-gray-900 mb-3">
                      Fitur Utama
                    </div>
                    <div className="space-y-2">
                      {selectedTemplate.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-start gap-2 text-sm text-gray-700"
                        >
                          <Check className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    {selectedTemplate.demo_url ? (
                      <a
                        href={selectedTemplate.demo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
                      >
                        <ExternalLink className="w-4 h-4 shrink-0" />
                        Demo
                      </a>
                    ) : null}
                    <button
                      onClick={() => handleChooseTemplate(selectedTemplate)}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium"
                    >
                      <CreditCard className="w-4 h-4" />
                      Lanjut ke Pembayaran
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {checkoutOpen && checkoutTemplate ? (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-600">
                  {checkoutMode === "new"
                    ? "Aktivasi Website"
                    : "Ganti Template"}
                </div>
                <div className="text-lg font-bold text-gray-900">
                  {checkoutTemplate.name}
                </div>
              </div>
              <button
                onClick={closeCheckout}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {checkoutError ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                  {checkoutError}
                </div>
              ) : null}

              {checkoutStep === "domain" ? (
                <div className="space-y-4">
                  <div className="font-semibold text-gray-900">
                    Pilih Domain
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDomainType("subdomain")}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        domainType === "subdomain"
                          ? "border-teal-600 ring-2 ring-teal-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        Subdomain Klandesa
                      </div>
                      <div className="text-sm text-gray-600">
                        contoh: desaku.klandesa.id
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDomainType("custom")}
                      className={`rounded-xl border p-4 text-left transition-colors ${
                        domainType === "custom"
                          ? "border-teal-600 ring-2 ring-teal-200"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="font-medium text-gray-900">
                        Custom Domain
                      </div>
                      <div className="text-sm text-gray-600">
                        contoh: desaku.id
                      </div>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      {domainType === "subdomain"
                        ? "Subdomain"
                        : "Custom domain"}
                    </div>
                    <div className="flex items-center gap-2">
                      {domainType === "subdomain" ? (
                        <>
                          <div className="text-sm text-gray-600 shrink-0">
                            https://
                          </div>
                          <input
                            value={domainValue}
                            onChange={(e) => setDomainValue(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            placeholder="desa-saya"
                          />
                          <div className="text-sm text-gray-600 shrink-0">
                            .klandesa.id
                          </div>
                        </>
                      ) : (
                        <input
                          value={domainValue}
                          onChange={(e) => setDomainValue(e.target.value)}
                          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                          placeholder="desasaya.id"
                        />
                      )}
                    </div>
                    {domainError ? (
                      <div className="text-sm text-red-600">{domainError}</div>
                    ) : null}
                    <div className="text-sm text-gray-600">
                      Biaya:{" "}
                      <span className="font-semibold">
                        {formatCurrency(checkoutTemplate.price)}
                      </span>{" "}
                      / tahun
                    </div>
                  </div>
                </div>
              ) : null}

              {checkoutStep === "warning" ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="font-semibold text-amber-900">
                      Peringatan
                    </div>
                    <div className="text-sm text-amber-800 mt-1">
                      Sebagian data/konten yang ada pada template lama mungkin
                      tidak muncul atau perlu penyesuaian pada template baru.
                    </div>
                  </div>

                  {proration ? (
                    <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                      <div className="font-semibold text-gray-900">
                        Perhitungan Biaya (Estimasi)
                      </div>
                      <div className="text-sm text-gray-700">
                        Template saat ini:{" "}
                        <span className="font-medium">
                          {proration.currentTemplate.name}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        Sisa masa aktif:{" "}
                        <span className="font-medium">
                          {proration.remainingDays} hari
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        Harga template baru:{" "}
                        <span className="font-medium">
                          {formatCurrency(checkoutTemplate.price)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-700">
                        Kredit masa aktif tersisa:{" "}
                        <span className="font-medium">
                          {formatCurrency(proration.credit)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-900">
                        Perkiraan bayar hari ini:{" "}
                        <span className="font-bold">
                          {formatCurrency(proration.payableEstimate)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Tagihan final mengikuti invoice yang diterbitkan.
                      </div>
                    </div>
                  ) : null}

                  <label className="flex items-start gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={warningAccepted}
                      onChange={(e) => setWarningAccepted(e.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      Saya mengerti dan ingin melanjutkan ganti template
                    </span>
                  </label>
                </div>
              ) : null}

              {checkoutStep === "bank" ? (
                <div className="space-y-4">
                  <div className="font-semibold text-gray-900">
                    Pilih Bank (Virtual Account)
                  </div>
                  {banksLoading ? (
                    <div className="text-sm text-gray-600">
                      Memuat daftar bank...
                    </div>
                  ) : (
                    <select
                      value={selectedBankId}
                      onChange={(e) => setSelectedBankId(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    >
                      <option value="">Pilih bank</option>
                      {vaBanks.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="text-sm text-gray-600">Ringkasan</div>
                    <div className="text-sm text-gray-900 mt-1">
                      Template:{" "}
                      <span className="font-semibold">
                        {checkoutTemplate.name}
                      </span>
                    </div>
                    {checkoutMode === "new" ? (
                      <div className="text-sm text-gray-900">
                        Domain:{" "}
                        <span className="font-semibold">
                          {domainType === "subdomain"
                            ? `${domainValue.trim().toLowerCase()}.klandesa.id`
                            : domainValue.trim().toLowerCase()}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {checkoutStep === "payment" && activeInvoice ? (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <div className="text-sm text-gray-600">Invoice</div>
                        <div className="font-semibold text-gray-900">
                          {activeInvoice.invoiceNumber}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Total</div>
                        <div className="font-bold text-teal-700">
                          {formatCurrency(activeInvoice.amount)}
                        </div>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3 pt-2">
                      <div className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm text-gray-600">Bank</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {activeInvoice.bankCode ?? "-"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-gray-200 p-3">
                        <div className="text-sm text-gray-600">VA Number</div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-sm font-semibold text-gray-900 break-all">
                            {activeInvoice.vaNumber ?? "-"}
                          </div>
                          {activeInvoice.vaNumber ? (
                            <button
                              type="button"
                              onClick={() =>
                                copyText(activeInvoice.vaNumber || "")
                              }
                              className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium"
                            >
                              Salin
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {activeInvoice.paymentUrl ? (
                      <a
                        href={activeInvoice.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium mt-3"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Buka Halaman Pembayaran
                      </a>
                    ) : null}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={refreshInvoiceStatus}
                      disabled={statusCheckLoading}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
                    >
                      {statusCheckLoading
                        ? "Mengecek..."
                        : "Cek Status Pembayaran"}
                    </button>
                    <button
                      type="button"
                      onClick={closeCheckout}
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 transition-colors font-medium"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="p-6 border-t border-gray-200 flex items-center justify-end gap-3">
              {checkoutStep !== "payment" ? (
                <>
                  <button
                    type="button"
                    onClick={closeCheckout}
                    className="px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={proceedCheckout}
                    disabled={checkoutLoading}
                    className="px-4 py-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 transition-colors font-medium"
                  >
                    {checkoutLoading ? "Memproses..." : "Lanjut"}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
