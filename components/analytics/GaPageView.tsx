"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Mengirim `page_view` GA4 secara manual SETELAH title halaman baru terpasang.
 *
 * Pelacakan otomatis GA4 ("page changes based on browser history events") menembak saat router memanggil
 * pushState, sedangkan <title> halaman tujuan baru terpasang setelah commit. Akibatnya navigasi sisi-klien
 * tercatat dengan title halaman SEBELUMNYA, dan laporan Pages and screens menumpuk di satu judul.
 * Tag ini dikonfigurasi `send_page_view: false`; komponen ini yang mengirim page_view (termasuk muat pertama).
 */
const FALLBACK_MS = 1500;

export function GaPageView({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const lastTitle = useRef<string | null>(null);

  useEffect(() => {
    let sent = false;
    let fallback: number | undefined;
    let debounce: number | undefined;
    let observer: MutationObserver | undefined;

    const send = () => {
      if (sent) return;
      sent = true;
      observer?.disconnect();
      window.clearTimeout(fallback);
      window.clearTimeout(debounce);
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      // gtag() menaruh objek `arguments` (bukan array) di dataLayer; ditulis ulang agar bisa dipakai sebelum gtag.js termuat.
      // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-unused-vars
      (function gtag(..._args: unknown[]) { w.dataLayer!.push(arguments); })(
        "event",
        "page_view",
        {
          send_to: measurementId,
          page_title: document.title,
          page_location: window.location.href,
        },
      );
      lastTitle.current = document.title;
    };

    if (document.title !== lastTitle.current) {
      // Title sudah berbeda dari halaman sebelumnya: cukup tunggu sebentar agar commit selesai.
      debounce = window.setTimeout(send, 50);
    } else {
      // Title belum berganti (metadata streaming): kirim begitu berubah, atau paling lambat FALLBACK_MS.
      const titleEl = document.querySelector("title");
      if (titleEl) {
        observer = new MutationObserver(() => {
          window.clearTimeout(debounce);
          debounce = window.setTimeout(send, 50);
        });
        observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
      }
      fallback = window.setTimeout(send, FALLBACK_MS);
    }

    return () => {
      sent = true;
      observer?.disconnect();
      window.clearTimeout(fallback);
      window.clearTimeout(debounce);
    };
  }, [pathname, measurementId]);

  return null;
}
