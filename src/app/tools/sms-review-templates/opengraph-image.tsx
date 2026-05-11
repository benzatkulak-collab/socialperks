import { renderToolOG, TOOL_OG_SIZE, TOOL_OG_CONTENT_TYPE } from "@/lib/seo/tool-og";

export const runtime = "nodejs";
export const alt = "Free SMS Review Request Templates";
export const size = TOOL_OG_SIZE;
export const contentType = TOOL_OG_CONTENT_TYPE;

export default async function OGImage() {
  return renderToolOG({
    title: "SMS Review Templates",
    subtitle:
      "27 pre-written SMS templates for asking customers for reviews. Post-purchase, service, event, meal. All under 160 chars.",
    tag: "Templates",
  });
}
