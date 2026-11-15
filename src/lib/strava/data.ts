import "server-only";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/auth/session";

export type StravaStatus = components["schemas"]["StravaStatus"];

/** Estado del conector; `null` si la API no respondió. */
export async function getStravaStatus(): Promise<StravaStatus | null> {
  try {
    const { data } = await (await api()).GET("/integrations/strava");
    return data ?? null;
  } catch {
    return null;
  }
}
