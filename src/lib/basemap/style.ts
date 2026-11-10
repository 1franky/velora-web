import { DARK, LIGHT, layers, type Flavor } from "@protomaps/basemaps";
import type { StyleSpecification } from "maplibre-gl";

/**
 * Estilo del mapa base (ADR-015): temas claro y oscuro de Protomaps ajustados a la paleta de Velora (niebla y azul
 * noche) para que el recorrido en cempasúchil sea lo que destaca. Etiquetas en español.
 */
export type MapTheme = "light" | "dark";

export const TRACK_SOURCE = "recorrido";
export const ATTRIBUTION =
  '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>, <a href="https://protomaps.com" target="_blank" rel="noopener">Protomaps</a>';

const FLAVORS: Record<MapTheme, Flavor> = {
  // Verdes apagados (salvia): la vegetación da contexto sin competir con el recorrido.
  light: {
    ...LIGHT,
    background: "#dfe5ea",
    earth: "#eef1f3",
    water: "#c5d3dd",
    buildings: "#dde2e6",
    park_a: "#d3e3d5",
    park_b: "#c6dbc9",
    wood_a: "#d8e5d9",
    wood_b: "#cddfd0",
    scrub_a: "#dde8de",
    scrub_b: "#d3e2d5",
  },
  dark: { ...DARK, background: "#0d141c", earth: "#121a24", water: "#0b2233", buildings: "#1b2532" },
};

/** Colores del recorrido: los del acento de la app, con un borde que lo separa de calles y agua. */
export const TRACK_COLORS: Record<MapTheme, { line: string; casing: string }> = {
  light: { line: "#c76a0e", casing: "#ffffff" },
  dark: { line: "#f2a03d", casing: "#0d141c" },
};

/** Estilo con el mapa base, o solo un fondo liso si el archivo no está instalado. `origin` = URL del sitio. */
export function basemapStyle(theme: MapTheme, origin: string, hasBasemap: boolean): StyleSpecification {
  const flavor = FLAVORS[theme];
  if (!hasBasemap) {
    return {
      version: 8,
      sources: {},
      layers: [{ id: "fondo", type: "background", paint: { "background-color": flavor.earth } }],
    };
  }
  return {
    version: 8,
    glyphs: `${origin}/mapa/fonts/{fontstack}/{range}.pbf`,
    sprite: `${origin}/mapa/sprites/${theme}`,
    sources: {
      protomaps: {
        type: "vector",
        url: `pmtiles://${origin}/mapa/mexico.pmtiles`,
        attribution: ATTRIBUTION,
      },
    },
    layers: layers("protomaps", flavor, { lang: "es" }),
  };
}

/** Zoom para pedir el recorrido: el entero superior del zoom del mapa, dentro del rango de la API. */
export function trackZoomFor(mapZoom: number): number {
  return Math.min(22, Math.max(0, Math.ceil(mapZoom)));
}
