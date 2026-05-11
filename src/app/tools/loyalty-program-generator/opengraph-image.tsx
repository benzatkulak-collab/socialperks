import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free Loyalty Program Idea Generator";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "Loyalty Program Generator",
    subtitle:
      "Five customized loyalty program ideas in seconds. Pick your goal — get reward structures that actually work.",
    tag: "Generator",
  });
}
