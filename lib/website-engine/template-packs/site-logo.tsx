/** Hanya http(s) atau path relatif; nilai lain (mis. `javascript:`) diabaikan. */
export function sanitizeLogoUrl(raw: string | null | undefined): string | null {
  const s = (raw ?? "").trim();
  if (!s || s.length > 1000) return null;
  if (s.startsWith("//")) return null;
  if (s.startsWith("/") || /^https?:\/\//i.test(s)) return s;
  return null;
}

/** Logo desa di header situs; dekoratif karena nama desa selalu tampil di sebelahnya. */
export function SiteLogo(props: { url?: string | null; className?: string }) {
  const url = sanitizeLogoUrl(props.url);
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className={props.className ?? "h-10 w-auto max-w-[96px] object-contain"}
    />
  );
}
