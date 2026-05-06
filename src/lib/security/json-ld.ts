/**
 * Safe JSON serializer for embedding inside <script type="application/ld+json">.
 *
 * `JSON.stringify` does NOT escape `</script>`, `<!--`, U+2028, or U+2029
 * — meaning any user-controlled value inside a JSON-LD object can break
 * out of the script tag and inject arbitrary HTML into the page (stored
 * XSS).
 *
 * This helper escapes those sequences. Use it everywhere we embed JSON-LD
 * via `dangerouslySetInnerHTML`.
 *
 * Reference: OWASP "Cross Site Scripting Prevention Cheat Sheet" — Rule
 * #3.1 (HTML escape JSON values in an HTML context).
 */

export function safeJsonForScript(value: unknown): string {
  return JSON.stringify(value)
    .replace(/<\/(script|style|!--)/gi, "<\\/$1")
    .replace(/<!--/g, "<\\!--")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
