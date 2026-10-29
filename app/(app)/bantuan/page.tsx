import Link from "next/link";
import { ArrowRight, BookOpen, CreditCard, Mail, MessageCircle, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Bantuan | Klandesa" };

const SUPPORT_WHATSAPP = "6282320337777";
const SUPPORT_EMAIL = "wisnuvb@gmail.com";

const guides = [
  {
    href: "/onboarding",
    icon: BookOpen,
    title: "Mulai dari sini",
    desc: "Empat langkah awal: profil desa, perangkat desa, data warga, dan template surat.",
  },
  {
    href: "/billing",
    icon: CreditCard,
    title: "Langganan & perpanjangan",
    desc: "Lihat masa berlaku, perpanjang 1, 3, 6, atau 12 bulan, dan kelola kapasitas tambahan.",
  },
] as const;

export default function BantuanPage() {
  const waHref = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent("Halo, saya butuh bantuan menggunakan Klandesa.")}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Bantuan</h1>
        <p className="mt-1 text-muted-foreground">
          Panduan mandiri dan cara menghubungi tim Klandesa.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Panduan mandiri</CardTitle>
          <CardDescription>Mulai dari yang paling sering dibutuhkan desa baru.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {guides.map(({ href, icon: Icon, title, desc }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex h-full gap-3 rounded-lg border p-4 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2 font-medium">
                      {title}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    </span>
                    <span className="mt-1 block text-sm text-muted-foreground">{desc}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex gap-3 rounded-lg border p-4">
            <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="text-sm">
              <p className="font-medium">Aplikasi seluler</p>
              <p className="mt-1 text-muted-foreground">
                Warga, RT, dan perangkat desa memakai aplikasi seluler Klandesa. Jawaban pertanyaan umum untuk
                pengguna aplikasi ada di menu Pusat Bantuan di dalam aplikasi.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hubungi dukungan</CardTitle>
          <CardDescription>Dukungan email dan chat tersedia pada jam kerja.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <a href={waHref} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Chat WhatsApp
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              <Mail className="mr-2 h-4 w-4" aria-hidden="true" />
              {SUPPORT_EMAIL}
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
