import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free CAC Calculator for Small Business";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "CAC Calculator",
    subtitle:
      "Calculate your Customer Acquisition Cost and benchmark it against your industry. Instant results.",
    tag: "Calculator",
  });
}
