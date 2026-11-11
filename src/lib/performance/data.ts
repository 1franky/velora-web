import "server-only";
import type { components } from "@/lib/api/schema";
import type { LoadError, Loaded } from "@/lib/activities/data";
import { api } from "@/lib/auth/session";
import type { TimeseriesQuery } from "./trends";

export type Timeseries = components["schemas"]["Timeseries"];

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
