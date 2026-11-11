import "server-only";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/auth/session";

export type ExplorationSummary = components["schemas"]["ExplorationSummary"];
export type LargestSquare = components["schemas"]["LargestSquare"];

/** Resumen de exploración; `null` si la API no responde (la página sigue mostrando el mapa). */
export async function getExplorationSummary(): Promise<ExplorationSummary | null> {
  try {
    const { data } = await (await api()).GET("/geo/exploration/summary");
    return data ?? null;
  } catch {
    return null;
  }
}

export async function getLargestSquare(): Promise<LargestSquare | null> {
  try {
    const { data } = await (await api()).GET("/geo/exploration/largest-square");
    return data ?? null;
  } catch {
    return null;
  }
}
