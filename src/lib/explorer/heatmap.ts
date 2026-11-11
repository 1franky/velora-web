import type { ActivityFilters } from "@/lib/activities/filters";

/** Zoom máximo de las teselas del mapa de calor (contrato); más cerca, MapLibre amplía las del 16. */
export const HEATMAP_MAX_ZOOM = 16;

/** Consulta de las teselas del mapa de calor a partir de los filtros de la URL (sin distancias: no aplican). */
export function heatmapQuery(filters: ActivityFilters): string {
  const query = new URLSearchParams();
  if (filters.desde) query.set("from", filters.desde);
  if (filters.hasta) query.set("to", filters.hasta);
  if (filters.tipo) query.set("subType", filters.tipo);
  if (filters.bici) query.set("bikeId", filters.bici);
  return query.toString();
}

/** Coordenadas de tesela válidas para el contrato: zoom 0–16 y columna/fila dentro de la rejilla. */
export function validTile(z: number, x: number, y: number): boolean {
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > HEATMAP_MAX_ZOOM) return false;
  const size = 2 ** z;
  return x >= 0 && y >= 0 && x < size && y < size;
}
