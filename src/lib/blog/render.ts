/**
 * Tiny, dependency-free markdown renderer for blog posts.
 *
 * Supported syntax:
 *   ## Heading 2
 *   ### Heading 3
 *   - bullet list
 *   1. numbered list
 *   > blockquote
 *   **bold** and *italic*
 *   [text](url)
 *   blank line = paragraph break
 *
 * Returns a string of HTML. All non-anchor text is escaped.
 */

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inline(text: string): string {
  let out = escapeHtml(text);
  // bold
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong class="text-brand-white">$1</strong>');
  // italic
  out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>');
  // links
  out = out.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_m, label: string, href: string) =>
      `<a href="${href.replace(/"/g, "&quot;")}" class="text-brand-cyan underline decoration-brand-cyan/30 underline-offset-4 transition-colors hover:decoration-brand-cyan">${label}</a>`,
  );
  return out;
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export interface RenderResult {
  html: string;
  headings: Heading[];
  wordCount: number;
}

export function renderMarkdown(md: string): RenderResult {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out: string[] = [];
  const headings: Heading[] = [];
  let i = 0;
  let wordCount = 0;
  const usedIds = new Map<string, number>();

  function uniqueId(base: string): string {
    const seen = usedIds.get(base) ?? 0;
    usedIds.set(base, seen + 1);
    return seen === 0 ? base : `${base}-${seen}`;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (!line.trim()) {
      i++;
      continue;
    }

    // h2
    if (line.startsWith("## ")) {
      const text = line.slice(3).trim();
      const id = uniqueId(slugifyHeading(text));
      headings.push({ id, text, level: 2 });
      out.push(
        `<h2 id="${id}" class="font-heading text-2xl italic text-brand-white sm:text-3xl mt-12 mb-4 scroll-mt-24">${inline(text)}</h2>`,
      );
      wordCount += text.split(/\s+/).length;
      i++;
      continue;
    }

    // h3
    if (line.startsWith("### ")) {
      const text = line.slice(4).trim();
      const id = uniqueId(slugifyHeading(text));
      headings.push({ id, text, level: 3 });
      out.push(
        `<h3 id="${id}" class="font-heading text-xl italic text-brand-white mt-8 mb-3 scroll-mt-24">${inline(text)}</h3>`,
      );
      wordCount += text.split(/\s+/).length;
      i++;
      continue;
    }

    // unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith("- ")) {
        const item = lines[i].slice(2).trim();
        items.push(`<li class="mb-2">${inline(item)}</li>`);
        wordCount += item.split(/\s+/).length;
        i++;
      }
      out.push(
        `<ul class="my-5 list-disc space-y-1 pl-6 text-brand-dim marker:text-brand-cyan">${items.join("")}</ul>`,
      );
      continue;
    }

    // ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        const item = lines[i].replace(/^\d+\.\s/, "").trim();
        items.push(`<li class="mb-2">${inline(item)}</li>`);
        wordCount += item.split(/\s+/).length;
        i++;
      }
      out.push(
        `<ol class="my-5 list-decimal space-y-1 pl-6 text-brand-dim marker:text-brand-cyan">${items.join("")}</ol>`,
      );
      continue;
    }

    // blockquote
    if (line.startsWith("> ")) {
      const buffer: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buffer.push(lines[i].slice(2).trim());
        wordCount += lines[i].slice(2).trim().split(/\s+/).length;
        i++;
      }
      out.push(
        `<blockquote class="my-6 border-l-4 border-brand-cyan/60 bg-brand-card/40 px-5 py-3 italic text-brand-dim">${inline(buffer.join(" "))}</blockquote>`,
      );
      continue;
    }

    // paragraph: gather until blank line or block element
    const paraBuffer: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith("## ") &&
      !lines[i].startsWith("### ") &&
      !lines[i].startsWith("- ") &&
      !/^\d+\.\s/.test(lines[i]) &&
      !lines[i].startsWith("> ")
    ) {
      paraBuffer.push(lines[i]);
      i++;
    }
    const paraText = paraBuffer.join(" ");
    wordCount += paraText.split(/\s+/).length;
    out.push(
      `<p class="my-5 leading-relaxed text-brand-dim">${inline(paraText)}</p>`,
    );
  }

  return { html: out.join("\n"), headings, wordCount };
}

export function estimateReadingTime(wordCount: number): number {
  // Average reading speed ~225 wpm
  return Math.max(1, Math.round(wordCount / 225));
}
