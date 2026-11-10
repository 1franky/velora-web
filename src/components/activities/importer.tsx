"use client";

import { CircleAlert, CircleCheck, Copy, FileUp, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";
import { activitiesChanged } from "@/app/(app)/actividades/actions";
import type { components } from "@/lib/api/schema";
import { formatFileSize } from "@/lib/format/units";

type ImportJob = components["schemas"]["ImportJob"];
type JobStatus = ImportJob["status"];
type WarningCode = ImportJob["warnings"][number]["code"];

/** 50 MB por archivo (ADR-009); se comprueba antes de subir para no gastar la conexión. */
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const EXTENSIONS = ["fit", "gpx", "tcx"];
const TERMINAL: readonly JobStatus[] = ["COMPLETED", "DUPLICATE", "REJECTED", "FAILED"];
/** Espera entre consultas del trabajo: rápida al principio, luego cada 3 s; se rinde a los 5 minutos. */
const POLL_DELAYS_MS = [400, 800, 1200, 2000, 3000];
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

type ItemState = "waiting" | "uploading" | JobStatus | "error";

type Item = {
  key: number;
  file: File;
  state: ItemState;
  activityId?: string | null;
  errorKey?: string;
  detail?: string;
  warnings?: ImportJob["warnings"];
  possibleDuplicates?: string[];
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extensionOf(name: string) {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

/** Primera validación en el navegador; la API vuelve a validar por contenido. */
function precheck(file: File): string | undefined {
  if (!EXTENSIONS.includes(extensionOf(file.name))) return "wrongExtension";
  if (file.size > MAX_FILE_BYTES) return "tooLarge";
  if (file.size === 0) return "EMPTY_FILE";
  return undefined;
}

type Outcome = Partial<Item> & { state: ItemState };

/** Sube un archivo y sigue su trabajo hasta un estado final. Nunca lanza: todo error se vuelve un estado. */
async function importFile(file: File, onUpdate: (patch: Outcome) => void): Promise<Outcome> {
  const fail = (errorKey: string, detail?: string): Outcome => ({ state: "error", errorKey, detail });
  try {
    // Pasa por Proxy: deja un access token vigente antes de la subida, que va fuera de Proxy.
    const session = await fetch("/api/sesion", { cache: "no-store" });
    if (session.status === 401) return fail("session");

    onUpdate({ state: "uploading" });
    const form = new FormData();
    form.append("file", file);
    const upload = await fetch("/api/importaciones", { method: "POST", body: form });
    const accepted = (await upload.json().catch(() => ({}))) as { jobId?: string; error?: string; detail?: string };
    if (upload.status !== 202 || !accepted.jobId) {
      return fail(accepted.error ?? "unknown", accepted.detail);
    }

    onUpdate({ state: "QUEUED" });
    const started = Date.now();
    for (let attempt = 0; Date.now() - started < POLL_TIMEOUT_MS; attempt++) {
      await sleep(POLL_DELAYS_MS[Math.min(attempt, POLL_DELAYS_MS.length - 1)]);
      const response = await fetch(`/api/importaciones/${accepted.jobId}`, { cache: "no-store" });
      if (response.status === 401) return fail("session");
      if (!response.ok) continue; // un fallo pasajero no cancela el seguimiento
      const job = (await response.json()) as ImportJob;
      const patch: Outcome = {
        state: job.status,
        activityId: job.activityId,
        warnings: job.warnings,
        possibleDuplicates: job.possibleDuplicateActivityIds,
        errorKey: job.errorCode ?? undefined,
        detail: job.errorDetail ?? undefined,
      };
      if (TERMINAL.includes(job.status)) return patch;
      onUpdate(patch);
    }
    return fail("unavailable");
  } catch {
    return fail("unavailable");
  }
}

export function Importer() {
  const t = useTranslations("imports");
  const [items, setItems] = useState<Item[]>([]);
  const [dragging, setDragging] = useState(false);
  const running = useRef(false);
  const nextKey = useRef(0);

  const update = useCallback((key: number, patch: Partial<Item>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }, []);

  // Procesa la cola de uno en uno: la API recibe un archivo por solicitud y así no compiten por el ancho de banda.
  useEffect(() => {
    if (running.current) return;
    const next = items.find((item) => item.state === "waiting");
    if (!next) return;
    running.current = true;
    const rejected = precheck(next.file);
    const work = rejected
      ? Promise.resolve<Outcome>({ state: "error", errorKey: rejected })
      : importFile(next.file, (patch) => update(next.key, patch));
    void work.then(async (outcome) => {
      if (outcome.state === "COMPLETED") {
        await activitiesChanged().catch(() => undefined);
      }
      update(next.key, outcome);
      running.current = false;
    });
  }, [items, update]);

  function add(files: FileList | null) {
    if (!files || files.length === 0) return;
    const added = Array.from(files, (file) => ({ key: nextKey.current++, file, state: "waiting" as const }));
    setItems((current) => [...current, ...added]);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    add(event.dataTransfer.files);
  }

  const finished = items.filter((item) => item.state === "error" || TERMINAL.includes(item.state as JobStatus));
  const busy = finished.length < items.length;

  return (
    <div className="flex flex-col gap-6">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors focus-within:outline-3 focus-within:outline-offset-2 focus-within:outline-acento-medio ${
          dragging ? "border-acento-medio bg-superficie-hundida" : "border-linea bg-superficie"
        }`}
      >
        <FileUp aria-hidden size={36} strokeWidth={1.5} className="text-acento" />
        <span className="font-display text-xl font-semibold">{t("drop")}</span>
        <span className="text-tinta-suave">
          {t("or")} <span className="font-semibold text-acento underline underline-offset-4">{t("choose")}</span>
        </span>
        <span className="text-sm text-tinta-suave">{t("accepted")}</span>
        <input
          type="file"
          multiple
          className="sr-only"
          onChange={(event) => {
            add(event.currentTarget.files);
            event.currentTarget.value = ""; // permite volver a elegir el mismo archivo
          }}
        />
      </label>

      {items.length > 0 && (
        <section aria-labelledby="cola" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="cola" className="text-2xl font-semibold">
              {t("queueLabel")}
            </h2>
            <p role="status" className="cifras text-tinta-suave">
              {t("summary", { done: finished.length, total: items.length })}
            </p>
          </div>
          <ul className="flex flex-col gap-2">
            {items.map((item) => (
              <ImportRow key={item.key} item={item} />
            ))}
          </ul>
          {!busy && (
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/actividades"
                className="rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110"
              >
                {t("back")}
              </Link>
              <button
                type="button"
                onClick={() => setItems([])}
                className="font-medium text-tinta-suave underline underline-offset-4 hover:text-tinta"
              >
                {t("clear")}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ImportRow({ item }: { item: Item }) {
  const t = useTranslations("imports");
  const errorText =
    item.state === "error" || item.state === "REJECTED" || item.state === "FAILED"
      ? t.has(`errors.${item.errorKey}`)
        ? t(`errors.${item.errorKey}` as "errors.unknown")
        : (item.detail ?? t("errors.unknown"))
      : undefined;
  const statusLabel = item.state === "error" ? t("status.FAILED") : t(`status.${item.state}`);
  const warnings = (item.warnings ?? []).filter((warning) => warning.code !== "POSSIBLE_DUPLICATE");
  const duplicates = item.possibleDuplicates ?? [];

  return (
    <li className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <StatusIcon state={item.state} />
        <span className="min-w-0 flex-1 font-semibold break-all">{item.file.name}</span>
        <span className="cifras text-sm text-tinta-suave">{formatFileSize(item.file.size)}</span>
        <span className="text-sm font-medium">{statusLabel}</span>
      </div>
      {errorText && <p className="text-negativo">{errorText}</p>}
      {warnings.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-tinta-suave">
          {warnings.map((warning) => (
            <li key={warning.code}>{t(`warnings.${warning.code as WarningCode}`, { count: warning.affectedCount })}</li>
          ))}
        </ul>
      )}
      {item.state === "COMPLETED" && duplicates.length > 0 && (
        <p className="text-sm">
          {t("possibleDuplicate", { count: duplicates.length })}{" "}
          {duplicates.map((id, index) => (
            <Link key={id} href={`/actividades/${id}`} className="font-medium text-acento underline underline-offset-4">
              {t("compare")}
              {duplicates.length > 1 ? ` ${index + 1}` : ""}
            </Link>
          ))}
        </p>
      )}
      {item.activityId && (item.state === "COMPLETED" || item.state === "DUPLICATE") && (
        <Link
          href={`/actividades/${item.activityId}`}
          className="self-start font-medium text-acento underline underline-offset-4"
        >
          {item.state === "COMPLETED" ? t("viewActivity") : t("viewExisting")}
        </Link>
      )}
    </li>
  );
}

function StatusIcon({ state }: { state: ItemState }) {
  const common = { "aria-hidden": true, size: 20, strokeWidth: 2 } as const;
  if (state === "COMPLETED") return <CircleCheck {...common} className="shrink-0 text-positivo" />;
  if (state === "DUPLICATE") return <Copy {...common} className="shrink-0 text-tinta-suave" />;
  if (state === "REJECTED" || state === "FAILED" || state === "error") {
    return <CircleAlert {...common} className="shrink-0 text-negativo" />;
  }
  if (state === "waiting") return <span aria-hidden className="size-5 shrink-0 rounded-full border-2 border-linea" />;
  return <LoaderCircle {...common} className="shrink-0 animate-spin text-acento-medio motion-reduce:animate-none" />;
}
