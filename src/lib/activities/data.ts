import "server-only";
import { cache } from "react";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/auth/session";
import type { ActivityQuery } from "./filters";

export type ActivitySummary = components["schemas"]["ActivitySummary"];
export type ActivityDetail = components["schemas"]["ActivityDetail"];
export type Bike = components["schemas"]["Bike"];

export type ActivityPage = { items: ActivitySummary[]; nextCursor: string | null };

/** Errores que la interfaz distingue: sesión caducada, consulta rechazada o API caída. */
export type LoadError = "session" | "invalid" | "unavailable";
export type Loaded<T> = { ok: true; data: T } | { ok: false; error: LoadError };

const PAGE_SIZE = 25;

function failure(status: number | undefined): { ok: false; error: LoadError } {
  if (status === 401) return { ok: false, error: "session" };
  if (status === 400) return { ok: false, error: "invalid" };
  return { ok: false, error: "unavailable" };
}

export async function listActivities(query: ActivityQuery, cursor?: string): Promise<Loaded<ActivityPage>> {
  try {
    const { data, response } = await (
      await api()
    ).GET("/activities", { params: { query: { ...query, cursor, limit: PAGE_SIZE } } });
    return data ? { ok: true, data } : failure(response.status);
  } catch {
    return failure(undefined);
  }
}

/** Bicicletas para el filtro y para mostrar su nombre. Si fallan, la lista sigue funcionando sin ellas. */
export async function listBikes(): Promise<Bike[]> {
  try {
    const { data } = await (await api()).GET("/bikes");
    return data?.items ?? [];
  } catch {
    return [];
  }
}

/** Con `cache`: la metadata y la página comparten una sola consulta por solicitud. */
export const getActivity = cache(async function getActivity(
  id: string,
): Promise<Loaded<ActivityDetail> | { ok: false; error: "notFound" }> {
  try {
    const { data, response } = await (
      await api()
    ).GET("/activities/{activityId}", {
      params: { path: { activityId: id } },
    });
    if (data) return { ok: true, data };
    if (response.status === 404) return { ok: false, error: "notFound" };
    return failure(response.status);
  } catch {
    return failure(undefined);
  }
});

export type ActivityLap = components["schemas"]["ActivityLap"];

export async function getStreams(id: string): Promise<Loaded<components["schemas"]["ActivityStreams"]>> {
  try {
    const { data, response } = await (
      await api()
    ).GET("/activities/{activityId}/streams", {
      params: { path: { activityId: id } },
    });
    return data ? { ok: true, data } : failure(response.status);
  } catch {
    return failure(undefined);
  }
}

export async function getLaps(id: string): Promise<Loaded<ActivityLap[]>> {
  try {
    const { data, response } = await (
      await api()
    ).GET("/activities/{activityId}/laps", {
      params: { path: { activityId: id } },
    });
    return data ? { ok: true, data: data.items } : failure(response.status);
  } catch {
    return failure(undefined);
  }
}

export async function getPossibleDuplicates(id: string): Promise<Loaded<ActivitySummary[]>> {
  try {
    const { data, response } = await (
      await api()
    ).GET("/activities/{activityId}/possible-duplicates", {
      params: { path: { activityId: id } },
    });
    return data ? { ok: true, data: data.items } : failure(response.status);
  } catch {
    return failure(undefined);
  }
}

export type ActionError = LoadError | "notFound";

/** Borra la actividad, sus datos derivados y su archivo original (irreversible). */
export async function deleteActivity(id: string): Promise<{ ok: true } | { ok: false; error: ActionError }> {
  try {
    const { response } = await (
      await api()
    ).DELETE("/activities/{activityId}", {
      params: { path: { activityId: id } },
    });
    if (response.status === 204) return { ok: true };
    if (response.status === 404) return { ok: false, error: "notFound" };
    return failure(response.status);
  } catch {
    return failure(undefined);
  }
}

/** Pide recalcular la actividad desde su original; devuelve el trabajo a seguir. */
export async function reprocessActivity(
  id: string,
): Promise<{ ok: true; jobId: string } | { ok: false; error: ActionError }> {
  try {
    const { data, response } = await (
      await api()
    ).POST("/activities/{activityId}/reprocess", {
      params: { path: { activityId: id } },
    });
    if (data) return { ok: true, jobId: data.jobId };
    if (response.status === 404) return { ok: false, error: "notFound" };
    return failure(response.status);
  } catch {
    return failure(undefined);
  }
}
