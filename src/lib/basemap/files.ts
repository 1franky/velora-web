import { join, resolve, sep } from "node:path";

/**
 * Archivos del mapa base (ADR-015) que sirve /mapa/*: el recorte PMTiles, las fuentes (glifos) y los iconos que
 * descarga `pnpm basemap`. Solo se aceptan esas rutas; cualquier otra es 404 sin tocar el disco.
 */
export const PMTILES_FILE = "mexico.pmtiles";

export function basemapDir(): string {
  return resolve(process.env.VELORA_BASEMAP_DIR ?? join(process.cwd(), "basemap"));
}

export type BasemapFile = { path: string; contentType: string; maxAgeSeconds: number };

const FONT = /^Noto Sans (Regular|Medium|Italic)$/;
const GLYPH_RANGE = /^\d{1,5}-\d{1,5}\.pbf$/;
const SPRITE = /^(light|dark)(@2x)?\.(json|png)$/;
const DAY = 86_400;

/** Traduce los segmentos de la URL a un archivo permitido dentro de `dir`, o null. */
export function resolveBasemapFile(segments: string[], dir: string): BasemapFile | null {
  let relative: string[] | null = null;
  let contentType = "";
  let maxAgeSeconds = 7 * DAY;

  if (segments.length === 1 && segments[0] === PMTILES_FILE) {
    relative = [PMTILES_FILE];
    contentType = "application/vnd.pmtiles";
    // El archivo se reemplaza al regenerar el mapa: el ETag lo detecta, pero se revalida a diario.
    maxAgeSeconds = DAY;
  } else if (
    segments.length === 3 &&
    segments[0] === "fonts" &&
    FONT.test(segments[1]) &&
    GLYPH_RANGE.test(segments[2])
  ) {
    relative = segments;
    contentType = "application/x-protobuf";
  } else if (segments.length === 2 && segments[0] === "sprites" && SPRITE.test(segments[1])) {
    relative = segments;
    contentType = segments[1].endsWith(".png") ? "image/png" : "application/json";
  }
  if (!relative) {
    return null;
  }
  const root = resolve(dir);
  const path = resolve(root, ...relative);
  // Defensa en profundidad: las expresiones ya impiden "..", pero el archivo debe quedar dentro de la carpeta.
  if (!path.startsWith(root + sep)) {
    return null;
  }
  return { path, contentType, maxAgeSeconds };
}

export type ByteRange = { start: number; end: number };

/**
 * Un solo rango `bytes=` (lo único que pide el cliente de PMTiles). undefined = sin rango (archivo completo);
 * null = rango inválido o fuera del archivo (416).
 */
export function parseRange(header: string | null, size: number): ByteRange | null | undefined {
  if (!header) {
    return undefined;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "")) {
    return null;
  }
  let start: number;
  let end: number;
  if (match[1] === "") {
    // Sufijo: los últimos N bytes.
    const suffix = Number(match[2]);
    if (suffix === 0) return null;
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? size - 1 : Math.min(Number(match[2]), size - 1);
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) {
    return null;
  }
  return { start, end };
}
