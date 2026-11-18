# ClipShort

Build the uploaded brief as a responsive, single-page video-clipping prototype at `/`.

## Experience
- Establish a polished dark-first interface with electric-purple accents and a working light/dark toggle.
- Let users enter a YouTube URL or select/drop a local video, configure clip count, duration, caption style, and aspect ratio, then start a simulated job.
- Show the five requested job stages, mock clip results with preview, score, time trimming, play/download/copy actions, and a timestamped collapsible transcript.
- Include URL/file validation, useful empty/loading/error states, and the video permission note.

## Structure
- Keep state in React; add small focused components and `api.ts` mock functions, with a clear replacement point for a future `http://localhost:8000` API.
- Update the global style tokens and the home page’s unique metadata. Avoid backend work and browser persistence.

## Verification
- Run the relevant tests and inspect the preview for the main generate-to-results flow and responsive layout.
