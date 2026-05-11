import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free Review ROI Calculator";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "Review ROI Calculator",
    subtitle:
      "See the extra revenue you'd earn by lifting your Google rating. Conservative numbers, instant results.",
    tag: "Calculator",
  });
}
