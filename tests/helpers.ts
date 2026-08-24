const ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
};

/** Decodes the handful of HTML entities Astro's server renderer escapes in text nodes. */
export function unescapeHtml(html: string): string {
  return html.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;/g, (m) => ENTITIES[m]);
}
