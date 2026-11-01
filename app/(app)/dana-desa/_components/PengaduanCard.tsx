import { MessageCircle, MessageSquareText, Phone } from "lucide-react";

/**
 * Kanal pengaduan Dana Desa ke Kementerian Desa dan Pembangunan Daerah Tertinggal.
 * Sumber [V]: Lampiran Permendesa PDT 16/2025, BAB III (Penutup), yang menyebut masyarakat Desa berhak menyampaikan pengaduan.
 */
const CHANNELS = [
  { id: "tel", label: "Telepon", shown: "1500040", href: "tel:1500040", Icon: Phone },
  { id: "sms", label: "SMS Center", shown: "0812 8899 0040", href: "sms:081288990040", Icon: MessageSquareText },
  { id: "wa", label: "WhatsApp", shown: "0877 8899 0040", href: "https://wa.me/6287788990040", Icon: MessageCircle },
] as const;

export function PengaduanCard() {
  return (
    <section aria-labelledby="dd-aduan-h" className="space-y-3 rounded-lg border p-4">
      <h2 id="dd-aduan-h" className="text-lg font-semibold">
        Pengaduan Dana Desa ke Kemendesa
      </h2>
      <p className="text-sm text-muted-foreground">Warga Desa berhak mengawasi penggunaan Dana Desa dan menyampaikan pengaduan langsung kepada Kementerian Desa dan Pembangunan Daerah Tertinggal.</p>
      <ul className="grid gap-2 sm:grid-cols-3">
        {CHANNELS.map(({ id, label, shown, href, Icon }) => (
          <li key={id}>
            <a href={href} {...(id === "wa" ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="flex min-h-11 items-center gap-3 rounded-md border p-3 hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
              <Icon aria-hidden="true" className="size-5 shrink-0" />
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">{label}</span>
                <span className="block font-medium tabular-nums">{shown}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        Kanal lain: situs{" "}
        <a href="https://www.kemendesa.go.id/" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          kemendesa.go.id
        </a>{" "}
        dan{" "}
        <a href="https://sipemandu.kemendesa.go.id" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          sipemandu.kemendesa.go.id
        </a>
        .
      </p>
      <p className="text-xs text-muted-foreground">Sumber: Lampiran Permendesa PDT 16/2025, BAB III (Penutup).</p>
    </section>
  );
}
