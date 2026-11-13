import Script from "next/script";
import { GaPageView } from "@/components/analytics/GaPageView";

const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || "G-CZ9VF7KHEV";

export function GoogleAdsTag() {
  if (!GOOGLE_ADS_ID || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-ads-tag" strategy="afterInteractive">
        {`
          if (['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) > -1) window['ga-disable-${GOOGLE_ADS_ID}'] = true;
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_ID}', { send_page_view: false });
        `}
      </Script>
      <GaPageView measurementId={GOOGLE_ADS_ID} />
    </>
  );
}
