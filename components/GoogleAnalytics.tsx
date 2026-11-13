import Script from "next/script";
import { GaPageView } from "@/components/analytics/GaPageView";

const GA_ID = process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_ID || "G-63EBFM4F66";

export function GoogleAnalytics() {
  if (!GA_ID || process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          if (['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) > -1) window['ga-disable-${GA_ID}'] = true;
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>
      <GaPageView measurementId={GA_ID} />
    </>
  );
}
