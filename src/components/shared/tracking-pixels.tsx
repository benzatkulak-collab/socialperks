/**
 * Conditional retargeting pixels.
 *
 * - Meta Pixel: enabled when NEXT_PUBLIC_META_PIXEL_ID is set
 * - Google Ads / GA4: enabled when NEXT_PUBLIC_GTAG_ID is set
 *
 * Both render `<script>` tags inline. Pixels are SSR-safe because we
 * gate on env vars at build time (NEXT_PUBLIC_* are baked in).
 *
 * If neither env var is set, this component renders nothing — no
 * extra network requests, no privacy leakage, no cookies.
 */

import Script from "next/script";

export function TrackingPixels() {
  const metaId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const gtagId = process.env.NEXT_PUBLIC_GTAG_ID;

  // Both empty → nothing rendered.
  if (!metaId && !gtagId) return null;

  return (
    <>
      {metaId && (
        <>
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${metaId}');
fbq('track', 'PageView');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src={`https://www.facebook.com/tr?id=${metaId}&ev=PageView&noscript=1`}
              alt=""
            />
          </noscript>
        </>
      )}

      {gtagId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagId}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gtagId}');`}
          </Script>
        </>
      )}
    </>
  );
}
