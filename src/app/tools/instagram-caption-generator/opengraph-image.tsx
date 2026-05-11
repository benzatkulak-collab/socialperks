import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free Instagram Caption Generator for Small Business";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "Instagram Caption Generator",
    subtitle:
      "Three caption options plus relevant hashtags. Pick your business type and vibe — no AI key required.",
    tag: "Generator",
  });
}
