import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free Google Business Profile Checker";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "Google Business Profile Checker",
    subtitle:
      "12-point audit of your Google Business Profile. See what's missing and exactly how to fix it.",
    tag: "Audit",
  });
}
