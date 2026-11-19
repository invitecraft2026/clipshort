import { describe, expect, it } from "vitest";
import { buildMockClips, isValidClipRange, isValidYouTubeUrl } from "@/lib/clipshort-model";

describe("ClipShort sample video validation", () => {
  it("accepts the supported YouTube link formats", () => {
    expect(isValidYouTubeUrl("https://www.youtube.com/watch?v=example123")).toBe(true);
    expect(isValidYouTubeUrl("https://youtu.be/example123")).toBe(true);
    expect(isValidYouTubeUrl("https://youtube.com/watch?v=example123")).toBe(true);
  });

  it("rejects invalid video URLs and links without a video ID", () => {
    expect(isValidYouTubeUrl("not a url")).toBe(false);
    expect(isValidYouTubeUrl("https://example.com/watch?v=example123")).toBe(false);
    expect(isValidYouTubeUrl("https://youtube.com/watch")).toBe(false);
    expect(isValidYouTubeUrl("https://youtu.be/")).toBe(false);
  });

  it("accepts the 3, 5, and 8 requested mock clips", () => {
    expect(buildMockClips(3, "30–60s", "Bold")).toHaveLength(3);
    expect(buildMockClips(5, "30–60s", "Bold")).toHaveLength(5);
    expect(buildMockClips(8, "30–60s", "Bold")).toHaveLength(8);
  });

  it.each([
    ["15–30s", 22],
    ["30–60s", 45],
    ["60–90s", 75],
  ])("keeps requested sample clips inside the %s length range", (length, expectedSeconds) => {
    const clips = buildMockClips(3, String(length), "Bold");
    expect(clips.every((clip) => Number.parseInt(clip.duration, 10) === expectedSeconds)).toBe(true);
    expect(clips.every((clip) => isValidClipRange(clip.start, clip.end))).toBe(true);
  });

  it("supports none, bold, and minimal caption choices", () => {
    expect(buildMockClips(1, "30–60s", "None")[0]?.caption).toBe("");
    expect(buildMockClips(1, "30–60s", "Bold")[0]?.caption).not.toBe("");
    expect(buildMockClips(1, "30–60s", "Minimal")[0]?.caption).toBe("It was waking up before sunrise and having the trail all to ourselves.");
  });

  it("requires a valid end time after its start", () => {
    expect(isValidClipRange("00:15", "00:45")).toBe(true);
    expect(isValidClipRange("00:45", "00:15")).toBe(false);
    expect(isValidClipRange("00:99", "01:15")).toBe(false);
    expect(isValidClipRange("0:10", "1:20")).toBe(true);
  });
});