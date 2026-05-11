import React from "react";
import Link from "next/link";

// Lightweight Markdown-ish renderer for pillar content.
// Supports: paragraphs (split by \n\n), **bold**, [text](href) links.
// Internal links (starting with "/") use next/link; external use <a>.

type Token =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "link"; value: string; href: string };

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;
  let buf = "";
  const flush = () => {
    if (buf.length > 0) {
      tokens.push({ type: "text", value: buf });
      buf = "";
    }
  };

  while (i < len) {
    // Markdown link [label](href)
    if (input[i] === "[") {
      const closeBracket = input.indexOf("]", i + 1);
      if (closeBracket !== -1 && input[closeBracket + 1] === "(") {
        const closeParen = input.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          flush();
          const label = input.slice(i + 1, closeBracket);
          const href = input.slice(closeBracket + 2, closeParen);
          tokens.push({ type: "link", value: label, href });
          i = closeParen + 1;
          continue;
        }
      }
    }
    // Bold **text**
    if (input[i] === "*" && input[i + 1] === "*") {
      const close = input.indexOf("**", i + 2);
      if (close !== -1) {
        flush();
        tokens.push({ type: "bold", value: input.slice(i + 2, close) });
        i = close + 2;
        continue;
      }
    }
    buf += input[i];
    i++;
  }
  flush();
  return tokens;
}

export function renderInline(input: string, keyPrefix = "i"): React.ReactNode[] {
  const tokens = tokenize(input);
  return tokens.map((t, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (t.type === "text") return React.createElement(React.Fragment, { key }, t.value);
    if (t.type === "bold") {
      return React.createElement(
        "strong",
        { key, className: "font-semibold text-brand-white" },
        t.value,
      );
    }
    // link
    const isInternal = t.href.startsWith("/");
    if (isInternal) {
      return React.createElement(
        Link,
        {
          key,
          href: t.href,
          className:
            "text-brand-cyan underline-offset-4 hover:underline",
        },
        t.value,
      );
    }
    return React.createElement(
      "a",
      {
        key,
        href: t.href,
        rel: "noopener noreferrer",
        target: "_blank",
        className: "text-brand-cyan underline-offset-4 hover:underline",
      },
      t.value,
    );
  });
}

export function renderBody(body: string, keyPrefix = "p"): React.ReactNode[] {
  // Split on blank lines into paragraphs
  const paragraphs = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return paragraphs.map((p, idx) => {
    const key = `${keyPrefix}-${idx}`;
    return React.createElement(
      "p",
      {
        key,
        className: "my-5 text-base leading-relaxed text-brand-text/85 md:text-lg",
      },
      renderInline(p, key),
    );
  });
}

// Strip markdown from a string for plain-text fallback (e.g. JSON-LD).
export function stripMarkdown(input: string): string {
  return input
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
