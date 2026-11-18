export type Clip = {
  id: string;
  title: string;
  start: string;
  end: string;
  duration: string;
  score: number;
  imageIndex: number;
  caption: string;
  excerpt: string;
};

export const transcriptLines = [
  { time: "00:00", text: "Everybody asks what the best part of this trip has been." },
  { time: "00:08", text: "And honestly, it wasn't the big moments I expected." },
  { time: "00:15", text: "It was waking up before sunrise and having the trail all to ourselves." },
  { time: "00:24", text: "We had no signal, no plan, and nowhere else we needed to be." },
  { time: "00:34", text: "That's when you remember what it feels like to really be somewhere." },
  { time: "00:45", text: "I think this is the kind of quiet I want more of." },
  { time: "01:02", text: "The waterfall was louder than anything we'd heard all week." },
  { time: "01:18", text: "This one view made every muddy mile feel completely worth it." },
  { time: "01:36", text: "The best stories are usually the ones you didn't plan to tell." },
  { time: "02:02", text: "If you're thinking about going, let this be your sign." },
];

export const sampleClips: Clip[] = [
  {
    id: "moment-one", title: "The moment everything went quiet", start: "00:08", end: "00:34", duration: "26s", score: 94,
    imageIndex: 0, caption: "Sometimes the best part is having nowhere else to be.", excerpt: "It was waking up before sunrise and having the trail all to ourselves.",
  },
  {
    id: "moment-two", title: "This view made it all worth it", start: "01:02", end: "01:28", duration: "26s", score: 87,
    imageIndex: 1, caption: "Every muddy mile was worth it for this.", excerpt: "This one view made every muddy mile feel completely worth it.",
  },
  {
    id: "moment-three", title: "Consider this your sign", start: "02:02", end: "02:34", duration: "32s", score: 81,
    imageIndex: 2, caption: "Somewhere out there, your next story is waiting.", excerpt: "If you're thinking about going, let this be your sign.",
  },
];

export function secondsFromTimecode(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length !== 2 || !parts.every((part) => /^\d+$/.test(part))) return null;
  const minutes = Number(parts[0]);
  const seconds = Number(parts[1]);
  if (minutes < 0 || seconds > 59 || seconds < 0) return null;
  return minutes * 60 + seconds;
}

export function isValidClipRange(start: string, end: string): boolean {
  const startSeconds = secondsFromTimecode(start);
  const endSeconds = secondsFromTimecode(end);
  return startSeconds !== null && endSeconds !== null && endSeconds > startSeconds;
}

export function isValidYouTubeUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return parsed.pathname.length > 1;
    return (host === "youtube.com" || host === "m.youtube.com") && (parsed.pathname === "/watch" ? parsed.searchParams.has("v") : /^\/(shorts|live|embed)\/[\w-]+/.test(parsed.pathname));
  } catch {
    return false;
  }
}