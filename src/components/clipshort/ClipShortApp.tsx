import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownToLine, ArrowRight, Check, ChevronDown, Clapperboard, Clock3,
  Copy, FileVideo2, Film, Link2, LoaderCircle, Moon, Play, Plus, Sparkles,
  Sun, Upload, Video, X,
} from "lucide-react";
import moments from "@/assets/clip-moments.jpg";
import { getClips, getJobStatus, startJob, type Job, type JobStage } from "@/lib/clipshort-api";
import { isValidClipRange, isValidYouTubeUrl, sampleClips, secondsFromTimecode, transcriptLines, type Clip } from "@/lib/clipshort-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type SelectOption<T extends string | number> = { value: T; label: string };
const stages: JobStage[] = ["Downloading", "Transcribing", "Finding best moments", "Cutting clips", "Adding captions"];
const imagePositions = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];

function isVideoFile(file: File) {
  return file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(file.name);
}

function formatDuration(start: string, end: string) {
  const left = secondsFromTimecode(start);
  const right = secondsFromTimecode(end);
  if (left === null || right === null) return "—";
  return `${right - left}s`;
}

function SegmentGroup<T extends string | number>({ label, options, value, onChange }: {
  label: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-1 rounded-lg bg-muted/75 p-1">
        {options.map((option) => (
          <Button key={option.value} type="button" variant="ghost" aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={`h-8 grow rounded-md px-2.5 text-xs ${value === option.value ? "segment-active" : "text-muted-foreground"}`}>
            {option.label}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

function UploadArea({ file, onFile, onClear }: { file: File | null; onFile: (file: File) => void; onClear: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const acceptFile = (candidate?: File) => {
    if (!candidate) return;
    if (!isVideoFile(candidate)) { setError("Choose a video file to continue."); return; }
    setError("");
    onFile(candidate);
  };
  return (
    <div onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files.item(0) ?? undefined); }}
      className={`upload-surface relative mt-3 rounded-lg border border-dashed px-5 py-3.5 transition-colors ${dragging ? "upload-active" : ""}`}>
      <input ref={inputRef} type="file" accept="video/*,.mov,.mkv" className="hidden"
        aria-label="Choose a video file" onChange={(event) => acceptFile(event.target.files?.item(0) ?? undefined)} />
      {file ? (
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FileVideo2 size={19} /></span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB · ready to process</p></div>
          <Button type="button" variant="ghost" size="icon" aria-label="Remove selected video" onClick={onClear}><X size={16} /></Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center">
          <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-muted-foreground"><Upload size={16} /></span>
          <p className="text-xs text-muted-foreground">Drop a video here, or <Button type="button" variant="link" className="h-auto p-0 text-xs text-primary" onClick={() => inputRef.current?.click()}>browse files</Button><span className="ml-1 hidden sm:inline">· MP4, MOV up to 2GB</span></p>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-destructive" role="alert">{error}</p>}
    </div>
  );
}

function UrlInput({ value, onChange, file, onFile, onClearFile }: {
  value: string; onChange: (value: string) => void; file: File | null; onFile: (file: File) => void; onClearFile: () => void;
}) {
  const [touched, setTouched] = useState(false);
  const invalid = touched && value.length > 0 && !isValidYouTubeUrl(value);
  return (
    <div>
      <label htmlFor="video-url" className="mb-2.5 block text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Video source</label>
      <div className={`url-input flex h-11 items-center gap-2.5 rounded-lg border px-3.5 transition-colors ${invalid ? "url-invalid" : ""}`}>
        <Link2 size={16} className="shrink-0 text-muted-foreground" />
        <Input id="video-url" type="url" inputMode="url" placeholder="Paste a YouTube link to get started…"
          value={value} aria-invalid={invalid} aria-describedby={invalid ? "url-error" : undefined}
          onChange={(event) => onChange(event.target.value)} onBlur={() => setTouched(true)}
          onKeyDown={(event) => { if (event.key === "Enter") setTouched(true); }}
          className="h-full min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
        <span className="hidden whitespace-nowrap text-[11px] text-muted-foreground sm:block">youtube.com · youtu.be</span>
      </div>
      {invalid && <p id="url-error" className="mt-2 text-xs text-destructive" role="alert">Enter a valid YouTube video link.</p>}
      <div className="my-4 flex items-center gap-3"><div className="h-px flex-1 bg-border" /><span className="text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">or</span><div className="h-px flex-1 bg-border" /></div>
      <UploadArea file={file} onFile={onFile} onClear={onClearFile} />
    </div>
  );
}

function ProgressTracker({ stageIndex, jobId }: { stageIndex: number; jobId: string }) {
  const progress = Math.round(((stageIndex + 1) / stages.length) * 100);
  return (
    <section aria-label="Video processing progress" className="animate-enter border-b border-border pb-9">
      <div className="mb-4 flex items-center justify-between gap-3"><div className="flex items-center gap-2.5"><span className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary"><LoaderCircle size={17} className="animate-spin" /></span><div><h2 className="text-sm font-semibold">Finding your best moments</h2><p className="mt-0.5 text-xs text-muted-foreground">{stageIndex >= stages.length ? "Your clips are ready" : `Step ${Math.min(stageIndex + 1, stages.length)} of ${stages.length} · ${stages[Math.min(stageIndex, stages.length - 1)]}`}</p></div></div><span className="font-mono text-xs text-muted-foreground">{progress}%</span></div>
      <Progress value={progress} className="h-1.5 rounded-full" />
      <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
        {stages.map((stage, index) => {
          const done = index < stageIndex;
          const active = index === stageIndex && stageIndex < stages.length;
          return <div key={stage} className={`flex min-w-0 items-center gap-2 text-[11px] ${done ? "text-primary" : active ? "text-foreground" : "text-muted-foreground"}`}>
            <span className={`flex size-[18px] shrink-0 items-center justify-center rounded-full ${done ? "bg-primary text-primary-foreground" : active ? "stage-active-ring text-primary" : "bg-muted text-muted-foreground"}`}>
              {done ? <Check size={11} strokeWidth={2.8} /> : active ? <LoaderCircle size={11} className="animate-spin" /> : <span className="size-1 rounded-full bg-current" />}
            </span><span className="truncate">{stage}</span>
          </div>;
        })}
      </div><span className="sr-only">Job {jobId}</span>
    </section>
  );
}

function timecodeWithOffset(timecode: string, elapsed: number) {
  const seconds = secondsFromTimecode(timecode);
  if (seconds === null) return "00:00";
  const result = Math.max(0, seconds + elapsed);
  return `${String(Math.floor(result / 60)).padStart(2, "0")}:${String(result % 60).padStart(2, "0")}`;
}

function ClipCard({ clip, index, onChange }: { clip: Clip; index: number; onChange: (clip: Clip) => void }) {
  const [playing, setPlaying] = useState(false);
  const startValue = secondsFromTimecode(clip.start);
  const endValue = secondsFromTimecode(clip.end);
  const videoName = clip.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const downloadClip = () => {
    const info = `ClipShort demo preview\n${clip.title}\n${clip.start}–${clip.end}\n${clip.caption}\n\nDemo only — connect a local processing API to export a video file.`;
    const url = URL.createObjectURL(new Blob([info], { type: "text/plain" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `${videoName}.txt`; anchor.click();
    URL.revokeObjectURL(url); toast.message("Sample clip details downloaded", { description: "Connect the local API to export video files." });
  };
  const copyCaption = async () => {
    try { await navigator.clipboard.writeText(clip.caption); toast.success("Caption copied"); }
    catch { toast.error("Clipboard isn’t available here"); }
  };
  return (
    <article className="clip-card group min-w-0 overflow-hidden rounded-lg border border-border bg-card">
      <div className="clip-preview relative mx-auto aspect-[9/13] w-full overflow-hidden" style={{ backgroundImage: `url(${moments})`, backgroundSize: "200% 200%", backgroundPosition: imagePositions[clip.imageIndex] ?? imagePositions[index % 4] }}>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md bg-black/45 px-2 py-1 text-[10px] font-medium text-white backdrop-blur"><Video size={12} /> 9:16</div>
        <Badge variant="secondary" className="absolute right-3 top-3 gap-1.5 border-0 bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur"><Sparkles size={11} className="text-primary" />{clip.score} <span className="font-normal text-white/70">score</span></Badge>
        <p className="preview-caption absolute bottom-12 left-4 right-4 text-center text-[clamp(0.9rem,1.5vw,1.15rem)] font-extrabold leading-snug text-white" key={clip.caption}>{clip.caption}</p>
        <Button type="button" size="icon" variant="ghost" aria-label={playing ? `Pause preview of ${clip.title}` : `Play preview of ${clip.title}`} onClick={() => { setPlaying(!playing); window.setTimeout(() => setPlaying(false), 1800); }} className="absolute bottom-3 left-3 size-8 rounded-full bg-black/50 text-white hover:bg-black/75 hover:text-white"><Play size={15} fill="currentColor" /></Button>
        <span className="absolute bottom-[17px] right-3 text-[10px] font-medium tabular-nums text-white/90">{playing ? "Previewing" : `${clip.start} — ${clip.end}`}</span>
      </div>
      <div className="p-3.5 sm:p-4">
        <div className="min-h-[54px]"><p className="line-clamp-2 text-[13px] font-semibold leading-[1.45]">{clip.title}</p><p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"><Clock3 size={12} /> {clip.start} – {clip.end} <span>·</span> {formatDuration(clip.start, clip.end)}</p></div>
        <div className="mt-4 border-t border-border pt-3"><p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">Trim clip <span className="normal-case tracking-normal">· mm:ss</span></p>
          <div className="grid grid-cols-2 gap-2">
            {(["start", "end"] as const).map((key) => {
              const invalidRange = !isValidClipRange(clip.start, clip.end);
              return <label key={key} className={`time-field flex h-9 min-w-0 items-center gap-1.5 rounded-md border px-2 ${invalidRange ? "time-invalid" : ""}`}><span className="shrink-0 text-[10px] capitalize text-muted-foreground">{key}</span>
                <input aria-label={`${key} time for ${clip.title}`} type="text" inputMode="numeric" pattern="[0-9]{1,3}:[0-5][0-9]" value={clip[key]} onChange={(event) => onChange({ ...clip, [key]: event.target.value })} onBlur={() => {
                  if (!isValidClipRange(clip.start, clip.end) && !invalidRange) {
                    const replacement = key === "start" ? timecodeWithOffset(clip.end, -15) : timecodeWithOffset(clip.start, 15);
                    onChange({ ...clip, [key]: replacement });
                  }
                }} className="min-w-0 w-full bg-transparent font-mono text-xs tabular-nums outline-none" />
              </label>;
            })}
          </div>
          {!isValidClipRange(clip.start, clip.end) && <p className="mt-1.5 text-[10px] text-destructive" role="alert">Enter valid times, with the end after the start.</p>}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_40px_40px] gap-2">
          <Button type="button" size="sm" variant="outline" onClick={downloadClip} className="h-8 gap-1.5 px-2 text-[11px]"><ArrowDownToLine size={13} /> Download</Button>
          <Button type="button" size="icon" variant="outline" aria-label={`Copy caption for ${clip.title}`} title="Copy caption" onClick={copyCaption} className="size-8"><Copy size={13} /></Button>
          <Button type="button" size="icon" variant="outline" aria-label={`Download sample for ${clip.title}`} title="Save sample details" onClick={downloadClip} className="size-8"><Plus size={13} className="rotate-45" /></Button>
        </div>
      </div>
    </article>
  );
}

function TranscriptPanel() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <CollapsibleTrigger asChild>
          <Button type="button" variant="ghost" className="flex h-auto w-full justify-between rounded-none px-4 py-3.5 text-left hover:bg-muted/35 sm:px-5">
            <span className="flex items-center gap-3"><span className="flex size-9 items-center justify-center rounded-md bg-secondary text-muted-foreground"><Clapperboard size={16} /></span><span><span className="block text-sm font-semibold">Transcript</span><span className="mt-0.5 block text-xs font-normal text-muted-foreground">Timestamps from your video</span></span></span>
            <ChevronDown size={17} className={`shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent><div className="transcript-scroll max-h-72 overflow-y-auto border-t border-border">
          {transcriptLines.map((line, index) => <Button key={`${line.time}-${line.text}`} type="button" variant="ghost" aria-pressed={selected === index} onClick={() => setSelected(index)} className={`flex h-auto w-full items-start justify-start gap-4 rounded-none px-5 py-3 text-left ${selected === index ? "transcript-active" : ""}`}>
            <span className="shrink-0 pt-0.5 font-mono text-[11px] tabular-nums text-primary">{line.time}</span><span className="text-xs leading-relaxed text-muted-foreground">{line.text}</span>
          </Button>)}
        </div></CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function ClipShortApp() {
  const [dark, setDark] = useState(true);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [clipCount, setClipCount] = useState(3);
  const [length, setLength] = useState("30–60s");
  const [captionStyle, setCaptionStyle] = useState("Bold");
  const [aspectRatio, setAspectRatio] = useState("9:16");
  const [job, setJob] = useState<Job | null>(null);
  const [stageIndex, setStageIndex] = useState(-1);
  const [clips, setClips] = useState<Clip[]>([]);
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [loadingClips, setLoadingClips] = useState(false);
  const [totalDuration, setTotalDuration] = useState("");

  const updateClip = useCallback((updated: Clip) => {
    setClips((current) => current.map((clip) => clip.id === updated.id ? { ...updated, duration: formatDuration(updated.start, updated.end) } : clip));
  }, []);

  useEffect(() => {
    if (!generating || !job) return;
    let cancelled = false;
    let currentStage = 0;
    let pendingTimer = 0;
    const advance = async () => {
      if (cancelled) return;
      if (currentStage >= stages.length) {
        setStageIndex(stages.length);
        setLoadingClips(true);
        const result = await getClips();
        if (cancelled) return;
        setClips(result.slice(0, clipCount).map((clip) => ({ ...clip, caption: captionStyle === "None" ? "" : captionStyle === "Minimal" ? clip.excerpt : clip.caption })));
        setLoadingClips(false);
        setGenerating(false);
        setError("");
        return;
      }
      setStageIndex(currentStage);
      const stageJob = await getJobStatus(job.id);
      if (cancelled || stageJob.status === "complete") return;
      pendingTimer = window.setTimeout(() => { currentStage += 1; void advance(); }, currentStage === 0 ? 780 : 660);
    };
    void advance();
    return () => { cancelled = true; window.clearTimeout(pendingTimer); };
  }, [generating, job, clipCount, captionStyle]);

  const submit = async () => {
    if (!url.trim() && !file) { setError("Paste a YouTube link or choose a video file first."); return; }
    if (url.trim() && !isValidYouTubeUrl(url)) { setError("That link doesn’t look like a valid YouTube video URL."); return; }
    if (file && !isVideoFile(file)) { setError("Choose a supported video file to continue."); return; }
    setError(""); setClips([]); setJob(null); setStageIndex(0); setTotalDuration("0"); setGenerating(true);
    try { setJob(await startJob()); }
    catch { setGenerating(false); setStageIndex(-1); setError("Couldn’t start this sample job. Please try again."); }
  };

  const followTranscript = (timestamp: string) => {
    const target = secondsFromTimecode(timestamp);
    const video = document.querySelector("video");
    if (target !== null && video && Number.isFinite(video.duration)) video.currentTime = target;
  };

  return (
    <div className={dark ? "app-theme-dark min-h-screen" : "app-theme-light min-h-screen"}>
      <header className="app-header sticky top-0 z-20 border-b border-border/80">
        <div className="mx-auto flex h-[62px] max-w-[1160px] items-center justify-between px-5 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5" aria-label="ClipShort home"><span className="brand-icon flex size-[30px] items-center justify-center rounded-lg bg-primary text-primary-foreground"><Film size={16} strokeWidth={2.3} /></span><span className="text-[16px] font-bold tracking-tight">ClipShort<span className="text-primary">.</span></span></a>
          <div className="flex items-center gap-3"><span className="hidden text-xs text-muted-foreground sm:inline">{dark ? "Dark" : "Light"}</span><Switch checked={dark} onCheckedChange={setDark} aria-label="Toggle light and dark theme"/><Sun size={15} className="text-muted-foreground" /></div>
        </div>
      </header>

      <main id="top" className="mx-auto max-w-[1160px] px-5 pb-12 pt-9 sm:px-8 sm:pt-11">
        <section className="intro-grid mb-8 grid grid-cols-1 items-end gap-5 sm:mb-9 sm:grid-cols-[1fr_auto] sm:gap-8">
          <div><div className="mb-3 flex items-center gap-2"><span className="h-px w-6 bg-primary" /><span className="text-[10px] font-semibold uppercase tracking-[0.17em] text-primary">AI-powered video editing</span></div>
            <h1 className="max-w-xl text-[clamp(2rem,5vw,3.15rem)] font-bold leading-[1.06] tracking-tight">Turn long videos into<br className="hidden sm:block" /> viral shorts<span className="text-primary">.</span></h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">Your best moments, clipped and captioned in seconds.</p>
          </div>
          <div className="hidden items-center gap-5 pb-1 sm:flex"><div className="flex -space-x-2"><span className="avatar-dot avatar-one"/><span className="avatar-dot avatar-two"/><span className="avatar-dot avatar-three"/></div><div><p className="text-xs font-medium">Made for the moments that matter</p><p className="mt-1 text-[11px] text-muted-foreground">From one video, ready for every feed</p></div></div>
        </section>

        <section className="input-panel rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 sm:px-6"><span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Video size={17}/></span><div><h2 className="text-sm font-semibold">Create your clips</h2><p className="mt-0.5 text-xs text-muted-foreground">Start with a video link or upload</p></div><Badge variant="secondary" className="ml-auto border-0 px-2 py-1 text-[10px] font-medium text-muted-foreground">SAMPLE MODE</Badge></div>
          <div className="p-4 sm:p-6"><UrlInput value={url} onChange={(value) => { setUrl(value); setError(""); }} file={file} onFile={(selected) => { setFile(selected); setUrl(""); setError(""); }} onClearFile={() => setFile(null)} />
            <div className="my-6 border-t border-border" />
            <div className="settings-grid grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
              <SegmentGroup label="Number of clips" value={clipCount} onChange={setClipCount} options={[{value:3,label:"3 clips"},{value:5,label:"5"},{value:8,label:"8"}]} />
              <SegmentGroup label="Clip length" value={length} onChange={setLength} options={[{value:"15–30s",label:"15–30s"},{value:"30–60s",label:"30–60s"},{value:"60–90s",label:"60–90s"}]} />
              <SegmentGroup label="Caption style" value={captionStyle} onChange={setCaptionStyle} options={[{value:"None",label:"None"},{value:"Bold",label:"Bold"},{value:"Minimal",label:"Minimal"}]} />
              <SegmentGroup label="Aspect ratio" value={aspectRatio} onChange={setAspectRatio} options={[{value:"9:16",label:"9:16"},{value:"1:1",label:"1:1"},{value:"16:9",label:"16:9"}]} />
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-h-5 flex-1 text-xs text-destructive" role="status" aria-live="polite">{error || (totalDuration ? "Sample video · 2:34" : "")}</div>
              <Button type="button" size="lg" disabled={generating || loadingClips} onClick={() => void submit()} className="generate-button h-11 w-full gap-2.5 rounded-lg px-6 text-sm font-semibold sm:w-auto">{generating || loadingClips ? <LoaderCircle size={17} className="animate-spin"/> : <Sparkles size={17}/>} {generating ? "Finding your clips…" : loadingClips ? "Preparing previews…" : "Generate clips"}<ArrowRight size={16}/></Button>
            </div>
          </div>
        </section>

        {generating && job && <div className="mt-8"><ProgressTracker stageIndex={stageIndex} jobId={job.id}/></div>}

        <section className="mt-9" aria-live="polite">
          {clips.length > 0 ? <>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><div className="mb-2 flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-md bg-primary/10 text-primary"><Sparkles size={13}/></span><span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-primary">Your highlights</span></div><h2 className="text-xl font-semibold tracking-tight">Top moments, ready to share<span className="ml-2 text-sm font-normal text-muted-foreground">{clips.length} clips</span></h2></div><Button type="button" variant="outline" size="sm" onClick={() => { setClips([]); setJob(null); setStageIndex(-1); }} className="h-8 gap-2 text-xs"><Film size={14}/> New video</Button></div>
            {totalDuration !== "" && <div className="mb-4 rounded-md bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">Requested <span className="font-medium text-foreground">{clipCount} clips</span> · <span className="font-medium text-foreground">{length}</span> · <span className="font-medium text-foreground">{aspectRatio}</span> · sample preview</div>}
            {clips.length === 0 ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><LoaderCircle size={16} className="animate-spin"/> Preparing your clips…</div> : <div className="clip-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{clips.map((clip, index) => <ClipCard key={clip.id} clip={clip} index={index} onChange={updateClip}/>)}</div>}
            {clips.length > 0 && <div className="mt-5"><TranscriptPanel/></div>}
          </> : !generating && !loadingClips && <div className="empty-state mt-9 flex min-h-28 items-center justify-center gap-3 border-y border-border px-4 py-6 text-center"><span className="flex size-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Clapperboard size={18}/></span><div className="text-left"><p className="text-sm font-medium">Your best moments are waiting</p><p className="mt-1 text-xs text-muted-foreground">Add a video above and we’ll find them for you.</p></div></div>}
        </section>
      </main>
      <footer className="border-t border-border"><div className="mx-auto flex max-w-[1160px] flex-col items-start justify-between gap-2 px-5 py-4 text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:px-8"><span className="flex items-center gap-2"><span className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary"><Film size={11}/></span>ClipShort</span><span>Only use videos you own or have permission to use.</span></div></footer>
      {totalDuration === "pending" && null}
    </div>
  );
}