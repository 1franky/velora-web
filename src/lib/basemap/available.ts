import "server-only";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { PMTILES_FILE, basemapDir } from "./files";

/** ¿Está instalado el recorte del mapa base? Sin él, el mapa dibuja el recorrido sobre un fondo liso. */
export async function basemapAvailable(): Promise<boolean> {
  const info = await stat(join(basemapDir(), PMTILES_FILE)).catch(() => null);
  return Boolean(info?.isFile() && info.size > 0);
}
