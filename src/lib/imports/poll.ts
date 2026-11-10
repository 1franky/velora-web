import type { components } from "@/lib/api/schema";

export type ImportJob = components["schemas"]["ImportJob"];
export type JobStatus = ImportJob["status"];

export const TERMINAL_STATUSES: readonly JobStatus[] = ["COMPLETED", "DUPLICATE", "REJECTED", "FAILED"];
/** Espera entre consultas: rápida al principio, luego cada 3 s; se rinde a los 5 minutos. */
const POLL_DELAYS_MS = [400, 800, 1200, 2000, 3000];
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

export type PollResult = { ok: true; job: ImportJob } | { ok: false; error: "session" | "unavailable" };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sigue un trabajo de importación o reproceso (GET /api/importaciones/{jobId}) hasta un estado final. Un fallo
 * pasajero no cancela el seguimiento; `onProgress` recibe los estados intermedios.
 */
export async function pollJob(jobId: string, onProgress?: (job: ImportJob) => void): Promise<PollResult> {
  const started = Date.now();
  for (let attempt = 0; Date.now() - started < POLL_TIMEOUT_MS; attempt++) {
    await sleep(POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)]);
    const response = await fetch(`/api/importaciones/${jobId}`, { cache: "no-store" }).catch(() => null);
    if (response?.status === 401) return { ok: false, error: "session" };
    if (!response?.ok) continue;
    const job = (await response.json()) as ImportJob;
    if (TERMINAL_STATUSES.includes(job.status)) return { ok: true, job };
    onProgress?.(job);
  }
  return { ok: false, error: "unavailable" };
}
