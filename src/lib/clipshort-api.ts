import { sampleClips } from "@/lib/clipshort-model";

export type JobStage = "Downloading" | "Transcribing" | "Finding best moments" | "Cutting clips" | "Adding captions";
export type Job = { id: string; status: "processing" | "complete"; stages: JobStage[] };

const jobStages: JobStage[] = ["Downloading", "Transcribing", "Finding best moments", "Cutting clips", "Adding captions"];

function wait(milliseconds: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
}

// Replace these mock implementations with fetch calls to the local Python API at http://localhost:8000.
export async function startJob(): Promise<Job> {
  await wait(180);
  return { id: `mock-${Date.now()}`, status: "processing", stages: jobStages };
}

export async function getJobStatus(jobId: string): Promise<Job> {
  await wait(260);
  return { id: jobId, status: "processing", stages: jobStages };
}

export async function getClips(): Promise<typeof sampleClips> {
  await wait(240);
  return sampleClips.map((clip) => ({ ...clip }));
}