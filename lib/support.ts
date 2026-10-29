/** Kontak dukungan Klandesa (sama dengan yang tampil di footer situs publik). */
export const SUPPORT_WHATSAPP = "6282320337777";
export const SUPPORT_EMAIL = "wisnuvb@gmail.com";

export function supportWhatsAppHref(message = "Halo, saya butuh bantuan menggunakan Klandesa."): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(message)}`;
}
