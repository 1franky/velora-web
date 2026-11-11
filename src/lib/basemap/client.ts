import type { Map as MapLibreMap, MapOptions } from "maplibre-gl";
import { basemapStyle, type MapTheme } from "./style";

/** Límites de México: vista inicial que no revela ninguna ubicación del usuario. */
export const MEXICO: [number, number, number, number] = [-118.6, 14.3, -86.5, 32.8];
/** Mantiene vigente el access token mientras el mapa pide teselas del mapa base (esas rutas no pasan por Proxy). */
export const KEEPALIVE_MS = 4 * 60 * 1000;

let protocolRegistered = false;

export function currentTheme(): MapTheme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Textos de los controles de MapLibre (`t` del espacio de nombres `map`). */
export function mapLocale(t: (key: string) => string, title: string) {
  return {
    "NavigationControl.ZoomIn": t("zoomIn"),
    "NavigationControl.ZoomOut": t("zoomOut"),
    "NavigationControl.ResetBearing": t("resetBearing"),
    "FullscreenControl.Enter": t("fullscreenEnter"),
    "FullscreenControl.Exit": t("fullscreenExit"),
    "AttributionControl.ToggleAttribution": t("toggleAttribution"),
    "CooperativeGesturesHandler.WindowsHelpText": t("gestureWindows"),
    "CooperativeGesturesHandler.MacHelpText": t("gestureMac"),
    "CooperativeGesturesHandler.MobileHelpText": t("gestureMobile"),
    "Map.Title": title,
  };
}

/**
 * Descarga MapLibre (solo en las páginas con mapa) y crea el mapa con el mapa base de Velora (ADR-015). Devuelve
 * `null` si el navegador no puede dibujarlo (WebGL desactivado).
 */
export async function createBaseMap(
  options: Omit<MapOptions, "style"> & { theme: MapTheme; hasBasemap: boolean },
): Promise<{ map: MapLibreMap; maplibre: typeof import("maplibre-gl") } | null> {
  const [maplibre, { Protocol }] = await Promise.all([import("maplibre-gl"), import("pmtiles")]);
  if (!protocolRegistered) {
    // Copiado por scripts/vendor-maplibre.mjs: la URL que calcula MapLibre no sobrevive al empaquetado.
    maplibre.setWorkerUrl(`/vendor/maplibre-gl/${maplibre.getVersion()}/maplibre-gl-worker.mjs`);
    maplibre.addProtocol("pmtiles", new Protocol().tile);
    protocolRegistered = true;
  }
  const { theme, hasBasemap, ...rest } = options;
  try {
    const map = new maplibre.Map({ ...rest, style: basemapStyle(theme, window.location.origin, hasBasemap) });
    return { map, maplibre };
  } catch {
    return null;
  }
}
