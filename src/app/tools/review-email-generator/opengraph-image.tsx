import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free Google Review Email Generator";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "Review Email Generator",
    subtitle:
      "Polite, effective Google review request emails in 3 tones. Fill in details, pick a tone, copy & send.",
    tag: "Generator",
  });
}
