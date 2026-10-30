import { after } from "next/server";
import { headers } from "next/headers";
import { isCountablePageView, recordPageView } from "@/lib/website-engine/page-views";

/** Dipanggil dari halaman publik tenant; pencatatan berjalan setelah respons terkirim sehingga tidak menambah latensi. */
export async function trackPublicPageView(villageId: number): Promise<void> {
  const h = await headers();
  const countable = isCountablePageView({
    userAgent: h.get("user-agent"),
    purpose: h.get("purpose") ?? h.get("sec-purpose"),
    nextRouterPrefetch: h.get("next-router-prefetch"),
  });
  if (!countable) return;
  after(() => recordPageView(villageId));
}
