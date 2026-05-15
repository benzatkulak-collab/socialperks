/**
 * Conditional PostHog product-analytics snippet.
 *
 * - Enabled only when NEXT_PUBLIC_POSTHOG_KEY is set in the environment.
 * - Falls back to rendering nothing if no key — zero network requests,
 *   zero cookies, zero privacy surface area.
 * - Honors a custom api_host via NEXT_PUBLIC_POSTHOG_HOST (defaults to
 *   PostHog Cloud US). Set to https://eu.i.posthog.com for EU residency
 *   or a self-hosted instance URL.
 * - The autocapture: true setting means pageviews + button clicks are
 *   captured automatically; explicit funnel events are fired by
 *   src/lib/analytics.ts.
 *
 * To enable in production, set on Render:
 *   NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxx
 *   NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com  (optional)
 *
 * IMPORTANT: PostHog keys prefixed `phc_` are "project keys" — safe to
 * expose in NEXT_PUBLIC_ env vars. Never use a personal API key here.
 */

import Script from "next/script";

export function PostHogLoader() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

  if (!key) return null;

  return (
    <Script id="posthog-snippet" strategy="afterInteractive">
      {`!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init me ws ys ps bs capture je Di ks register register_once register_for_session unregister unregister_for_session Ps getFeatureFlag getFeatureFlagPayload isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty Es $s createPersonProfile Is opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing Ss debug xs getPageViewId captureTraceFeedback captureTraceMetric".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
posthog.init('${key}', {api_host: '${host}', person_profiles: 'identified_only', capture_pageview: true, autocapture: true});`}
    </Script>
  );
}
