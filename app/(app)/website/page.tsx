"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  Globe,
  Headset,
  Images,
  Landmark,
  MapPin,
  Newspaper,
  Palette,
  Server,
  Smartphone,
} from "lucide-react";
import Link from "next/link";
import { usePayment } from "@/components/billing/PaymentProvider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermissions } from "@/hooks/use-permissions";
import { BILLING_CATALOG, formatIdr } from "@/lib/billing/catalog";
import { SUBSCRIPTION_DURATIONS } from "@/lib/billing/duration";
import {
  WEBSITE_CUSTOM_FIRST_TERM_MONTHS,
  WEBSITE_CUSTOM_PLAN_CODE,
} from "@/lib/website-service/subscription";
import type { BillingStatusResponse } from "../billing/_lib/types";

const PRICE = BILLING_CATALOG.website_custom;
const EXAMPLE_URL = "https://sumbersari.klandesa.com/";
const EXPIRING_SOON_DAYS = 30;

const BENEFITS = [
  {
    icon: Palette,
    title: "Dirancang khusus untuk desa",
    body: "Tampilan, susunan menu, dan isi mengikuti identitas serta kebutuhan desa Anda, bukan template pasaran.",
  },
  {
    icon: Server,
    title: "Hosting dan perawatan oleh kami",
    body: "Website berjalan di server Klandesa. Desa tidak perlu mengurus server, sertifikat keamanan, atau pembaruan teknis.",
  },
  {
    icon: Smartphone,
    title: "Nyaman dibuka di ponsel",
    body: "Tampil rapi di ponsel, tablet, dan komputer, karena sebagian besar warga mengakses lewat ponsel.",
  },
  {
    icon: Globe,
    title: "Alamat web resmi desa",
    body: "Alamat khusus desa Anda di klandesa.com. Domain milik desa sendiri dapat dibicarakan saat konsultasi.",
  },
  {
    icon: Headset,
    title: "Didampingi dari awal",
    body: "Tim kami membantu menata profil desa, perangkat desa, berita, dan galeri pada tahap awal pembuatan.",
  },
  {
    icon: CreditCard,
    title: "Tagihan di satu tempat",
    body: "Bayar lewat QRIS, Virtual Account, atau e-wallet. Masa aktif dan riwayat tagihan tercatat di Klandesa.",
  },
] as const;

const EXAMPLE_PAGES = [
  { icon: Landmark, label: "Beranda dengan banner dan statistik desa" },
  { icon: Newspaper, label: "Berita dan kegiatan desa" },
  { icon: Images, label: "Galeri foto dan video" },
  { icon: MapPin, label: "Potensi, wisata, dan kontak" },
] as const;

const STEPS = [
  {
    title: "Pesan dan bayar",
    body: "Pilih Pesan sekarang, lalu bayar lewat QRIS, Virtual Account, atau e-wallet.",
  },
  {
    title: "Konsultasi singkat",
    body: "Tim Klandesa menghubungi Anda lewat kontak di Profil Desa untuk mengumpulkan logo, profil, foto, dan kebutuhan menu.",
  },
  {
    title: "Dibangun dan ditinjau",
    body: "Kami membangun website, Anda meninjau dan meminta perbaikan sampai sesuai.",
  },
  {
    title: "Website tayang",
    body: "Website diluncurkan. Masa aktifnya tercatat dan bisa Anda lihat di halaman ini.",
  },
] as const;

const INCLUDED = [
  "Perancangan dan pembuatan website khusus desa",
  "Hosting dan perawatan teknis",
  "Alamat web resmi desa",
  `Masa aktif ${WEBSITE_CUSTOM_FIRST_TERM_MONTHS} bulan pertama`,
] as const;

const FAQS = [
  {
    q: "Apa bedanya dengan template?",
    a: "Template adalah tampilan jadi yang dipakai banyak desa. Di layanan ini website dirancang dan dibangun oleh tim kami untuk satu desa, sehingga struktur menu dan tampilannya menyesuaikan kebutuhan desa Anda.",
  },
  {
    q: "Berapa lama pembuatannya?",
    a: "Tergantung kelengkapan bahan dari desa (logo, profil, foto, berita) dan jumlah halaman yang diminta. Perkiraan waktu disampaikan tim kami pada konsultasi awal.",
  },
  {
    q: "Apakah harus memakai Paket Lengkap Klandesa?",
    a: "Tidak. Layanan website dipesan dan dibayar terpisah dari paket desa.",
  },
  {
    q: "Bagaimana perpanjangannya?",
    a: `Setelah ${WEBSITE_CUSTOM_FIRST_TERM_MONTHS} bulan pertama, perpanjangan ${formatIdr(PRICE.monthlyFee)} per bulan dan bisa dibayar untuk 1, 3, 6, atau 12 bulan. Perpanjangan menyambung sisa masa aktif, jadi tidak ada waktu yang hangus.`,
  },
  {
    q: "Bisakah meminta fitur atau halaman khusus?",
    a: "Bisa. Sampaikan kebutuhan Anda saat konsultasi. Tim kami akan menilai kelayakannya dan menyampaikan bila ada biaya tambahan sebelum dikerjakan.",
  },
  {
    q: "Bagaimana cara membayar?",
    a: "Lewat QRIS, Virtual Account bank, atau e-wallet melalui LinkQu. Tagihan dan buktinya tersimpan di menu Langganan > Riwayat Pembayaran.",
  },
] as const;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

type WebsiteService = NonNullable<BillingStatusResponse["websiteService"]>;

export default function WebsitePage() {
  const { pay } = usePayment();
  const { can } = usePermissions();
  const canOrder = can("billing", "create");

  const [status, setStatus] = useState<BillingStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/billing/status", { cache: "no-store" });
      const json = (await res.json()) as BillingStatusResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || "Gagal memuat status layanan");
      setStatus(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const service: WebsiteService | null = status?.websiteService ?? null;
  const isRenewal = service != null;

  const pendingInvoice = useMemo(
    () =>
      (status?.invoices ?? []).find(
        (inv) =>
          inv.productType === "website_custom" &&
          inv.status.toLowerCase() === "pending" &&
          (!inv.expiresAt || new Date(inv.expiresAt).getTime() > Date.now()),
      ),
    [status?.invoices],
  );

  const order = useCallback(() => {
    pay({
      productType: "website_custom",
      planCode: WEBSITE_CUSTOM_PLAN_CODE,
      title: isRenewal ? "Perpanjang Website Desa Kustom" : "Website Desa Kustom",
      amount: isRenewal ? PRICE.monthlyFee : PRICE.setupFee,
      durations: isRenewal ? SUBSCRIPTION_DURATIONS : undefined,
      note: isRenewal ? undefined : `Biaya awal, termasuk ${WEBSITE_CUSTOM_FIRST_TERM_MONTHS} bulan pertama`,
      resumeInvoiceId: pendingInvoice?.id,
      successMessage: isRenewal
        ? "Perpanjangan diterima. Masa aktif website sudah diperbarui."
        : "Pembayaran diterima. Tim Klandesa akan menghubungi Anda untuk memulai pembuatan website.",
      onPaid: load,
    });
  }, [pay, isRenewal, pendingInvoice?.id, load]);

  const ctaLabel = pendingInvoice
    ? "Lanjutkan pembayaran"
    : isRenewal
      ? "Perpanjang layanan"
      : "Pesan sekarang";

  const cta = (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={order} disabled={!canOrder || loading} className="min-h-11">
        {ctaLabel}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Button>
      {!canOrder && (
        <p className="text-sm text-muted-foreground">
          Pemesanan hanya bisa dilakukan oleh admin desa.
        </p>
      )}
    </div>
  );

  return (
    <div className="mx-auto space-y-14 pb-16">
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="space-y-6 pt-2">
        <Badge variant="secondary">Layanan tambahan</Badge>
        <div className="max-w-3xl space-y-4">
          <h1 id="hero-heading" className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Website resmi desa, dibangun khusus untuk desa Anda
          </h1>
          <p className="text-lg text-muted-foreground">
            Warga, calon investor, dan instansi lain bisa menemukan profil, berita, dan potensi desa Anda di satu alamat
            web. Kami membangun, menjalankan, dan merawatnya.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {cta}
          <Button asChild variant="outline" size="lg" className="min-h-11">
            <a href={EXAMPLE_URL} target="_blank" rel="noopener noreferrer">
              Lihat contoh: Desa Sumbersari
              <ExternalLink className="size-4" aria-hidden="true" />
              <span className="sr-only">(buka di tab baru)</span>
            </a>
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Mulai <span className="font-medium text-foreground tabular-nums">{formatIdr(PRICE.setupFee)}</span>, sudah
          termasuk {WEBSITE_CUSTOM_FIRST_TERM_MONTHS} bulan pertama.
        </p>
      </section>

      {/* Status layanan desa ini */}
      <section aria-labelledby="status-heading" aria-live="polite">
        <h2 id="status-heading" className="sr-only">
          Status layanan website desa Anda
        </h2>
        {loading ? (
          <Skeleton className="h-28 w-full rounded-xl" />
        ) : error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 p-4 text-sm">
            <AlertTriangle className="size-5 shrink-0 text-destructive" aria-hidden="true" />
            <span className="flex-1">{error}</span>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Coba lagi
            </Button>
          </div>
        ) : service ? (
          <ServiceStatusCard service={service} pending={Boolean(pendingInvoice)} />
        ) : pendingInvoice ? (
          <div className="flex items-start gap-3 rounded-xl border p-4">
            <Clock className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1 text-sm">
              <p className="font-medium">Ada tagihan yang menunggu pembayaran</p>
              <p className="text-muted-foreground">
                Selesaikan pembayaran dengan tombol Lanjutkan pembayaran. Layanan aktif setelah pembayaran terkonfirmasi.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* Contoh */}
      <section aria-labelledby="example-heading" className="space-y-6">
        <div className="max-w-2xl space-y-2">
          <h2 id="example-heading" className="text-2xl font-semibold tracking-tight">
            Seperti inilah hasilnya
          </h2>
          <p className="text-muted-foreground">
            Website Desa Sumbersari kami bangun dengan cara yang sama. Halaman yang umum ada di website desa:
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {EXAMPLE_PAGES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 rounded-xl border p-4">
              <Icon className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground">
          Isi dan susunan halaman disesuaikan dengan kebutuhan masing-masing desa.{" "}
          <a
            href={EXAMPLE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            Buka sumbersari.klandesa.com
            <span className="sr-only"> (buka di tab baru)</span>
          </a>
        </p>
      </section>

      {/* Keunggulan */}
      <section aria-labelledby="benefit-heading" className="space-y-6">
        <h2 id="benefit-heading" className="text-2xl font-semibold tracking-tight">
          Yang Anda dapatkan
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map(({ icon: Icon, title, body }) => (
            <li key={title} className="space-y-2 rounded-xl border p-5">
              <Icon className="size-6 text-primary" aria-hidden="true" />
              <h3 className="font-medium">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* Cara kerja */}
      <section aria-labelledby="steps-heading" className="space-y-6">
        <h2 id="steps-heading" className="text-2xl font-semibold tracking-tight">
          Cara kerjanya
        </h2>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="space-y-2 rounded-xl border p-5">
              <span
                aria-hidden="true"
                className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground tabular-nums"
              >
                {i + 1}
              </span>
              <h3 className="font-medium">
                <span className="sr-only">Langkah {i + 1}: </span>
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Harga */}
      <section aria-labelledby="price-heading" className="space-y-6">
        <h2 id="price-heading" className="text-2xl font-semibold tracking-tight">
          Harga
        </h2>
        <div className="grid gap-6 rounded-2xl border p-6 sm:p-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Biaya awal</p>
              <p className="text-4xl font-semibold tabular-nums">{formatIdr(PRICE.setupFee)}</p>
              <p className="text-sm text-muted-foreground">
                Sekali bayar di awal, sudah termasuk {WEBSITE_CUSTOM_FIRST_TERM_MONTHS} bulan pertama.
              </p>
            </div>
            <ul className="space-y-2">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-4 border-t pt-6 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
            <div>
              <p className="text-sm text-muted-foreground">Perpanjangan</p>
              <p className="text-4xl font-semibold tabular-nums">
                {formatIdr(PRICE.monthlyFee)}
                <span className="text-base font-normal text-muted-foreground"> / bulan</span>
              </p>
              <p className="text-sm text-muted-foreground">
                Mulai bulan ke-{WEBSITE_CUSTOM_FIRST_TERM_MONTHS + 1}. Bayar untuk 1, 3, 6, atau 12 bulan sekaligus.
                Sisa masa aktif disambung, tidak hangus.
              </p>
            </div>
            {cta}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section aria-labelledby="faq-heading" className="space-y-4">
        <h2 id="faq-heading" className="text-2xl font-semibold tracking-tight">
          Pertanyaan yang sering diajukan
        </h2>
        <Accordion type="single" collapsible className="rounded-xl border px-5">
          {FAQS.map((f, i) => (
            <AccordionItem key={f.q} value={`faq-${i}`}>
              <AccordionTrigger className="min-h-11 text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Ajakan penutup */}
      <section
        aria-labelledby="closing-heading"
        className="space-y-4 rounded-2xl bg-muted p-6 sm:p-8"
      >
        <h2 id="closing-heading" className="text-2xl font-semibold tracking-tight">
          Siap punya website resmi desa?
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Pesan sekarang, lalu tim kami menghubungi Anda lewat kontak yang tercatat di{" "}
          <Link
            href="/pengaturan-desa"
            className="font-medium text-primary underline underline-offset-4 hover:no-underline"
          >
            Profil Desa
          </Link>
          . Pastikan nomor telepon dan email di sana sudah benar.
        </p>
        {cta}
      </section>
    </div>
  );
}

function ServiceStatusCard({ service, pending }: { service: WebsiteService; pending: boolean }) {
  const expiringSoon = service.active && service.daysRemaining <= EXPIRING_SOON_DAYS;
  const Icon = service.active && !expiringSoon ? CheckCircle2 : AlertTriangle;
  const title = !service.active
    ? "Masa aktif layanan berakhir"
    : expiringSoon
      ? "Masa aktif segera berakhir"
      : "Layanan website aktif";

  return (
    <div className="flex items-start gap-3 rounded-xl border p-5">
      <Icon
        className={`mt-0.5 size-6 shrink-0 ${service.active && !expiringSoon ? "text-primary" : "text-destructive"}`}
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">
          Aktif sejak {formatDate(service.startDate)}. Berlaku sampai{" "}
          <span className="font-medium text-foreground">{formatDate(service.expiry)}</span>
          {service.active ? ` (${service.daysRemaining} hari lagi).` : "."}
        </p>
        {(!service.active || expiringSoon) && !pending && (
          <p className="text-sm text-muted-foreground">Perpanjang agar website desa tetap tayang.</p>
        )}
        {pending && (
          <p className="text-sm text-muted-foreground">Ada tagihan perpanjangan yang menunggu pembayaran.</p>
        )}
      </div>
    </div>
  );
}
