import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free UTM Link Generator";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "UTM Link Generator",
    subtitle:
      "Build properly-tagged UTM links for tracking campaigns across Google Analytics, Meta, and beyond.",
    tag: "Generator",
  });
}
