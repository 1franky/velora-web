import "server-only";
import type { components } from "@/lib/api/schema";
import type { LoadError, Loaded } from "@/lib/activities/data";
import { api } from "@/lib/auth/session";
import type { TimeseriesQuery } from "./trends";

export type Timeseries = components["schemas"]["Timeseries"];
export type Records = components["schemas"]["Records"];
export type Eddington = components["schemas"]["Eddington"];
export type HeartRateZones = components["schemas"]["HeartRateZones"];
export type TrainingLoad = components["schemas"]["TrainingLoad"];
type Filters = Pick<TimeseriesQuery, "includeIndoor" | "subType">;

function failure(status: number | undefined): { ok: false; error: LoadError } {
  if (status === 401) return { ok: false, error: "session" };
  if (status === 400) return { ok: false, error: "invalid" };
  return { ok: false, error: "unavailable" };
}

export async function getTimeseries(query: TimeseriesQuery): Promise<Loaded<Timeseries>> {
  try {
    const { data, response } = await (await api()).GET("/analytics/timeseries", { params: { query } });
    return data ? { ok: true, data } : failure(response.status);
  } catch {
    return failure(undefined);
  }
}

/** Récords y Eddington: `null` si la API no responde (Rendimiento sigue mostrando las tendencias). */
export async function getRecords(query: Filters): Promise<Records | null> {
  try {
    const { data } = await (await api()).GET("/analytics/records", { params: { query } });
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getEddington(query: Filters): Promise<Eddington | null> {
  try {
    const { data } = await (await api()).GET("/analytics/eddington", { params: { query } });
    return data ?? null;
  } catch {
    return null;
  }
}

/** Tiempo en zonas cardiacas del mismo rango que las tendencias; `null` si la API no responde. */
export async function getHeartRateZones(query: Filters & { from: string; to: string }): Promise<HeartRateZones | null> {
  try {
    const { data } = await (await api()).GET("/analytics/heart-rate", { params: { query } });
    return data ?? null;
  } catch {
    return null;
  }
}

/** Carga semanal estimada de las últimas 12 semanas; `null` si la API no responde. */
export async function getTrainingLoad(query: Filters): Promise<TrainingLoad | null> {
  try {
    const { data } = await (
      await api()
    ).GET("/analytics/training-load", { params: { query: { ...query, weeks: 12 } } });
    return data ?? null;
  } catch {
    return null;
  }
}
