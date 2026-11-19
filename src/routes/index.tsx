import { createFileRoute } from "@tanstack/react-router";
import { ClipShortApp } from "@/components/clipshort/ClipShortApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ClipShort — turn long videos into viral shorts" },
      { name: "description", content: "Find standout video moments, preview short clips, and shape captions with ClipShort." },
      { property: "og:title", content: "ClipShort — turn long videos into viral shorts" },
      { property: "og:description", content: "Find standout video moments, preview short clips, and shape captions with ClipShort." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  component: Index,
});

function Index() {
  return <ClipShortApp />;
}