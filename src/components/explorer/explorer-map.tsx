"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import type { components } from "@/lib/api/schema";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { KEEPALIVE_MS, MEXICO, createBaseMap, currentTheme, mapLocale } from "@/lib/basemap/client";
import { TRACK_COLORS, basemapStyle, type MapTheme } from "@/lib/basemap/style";
import { HEATMAP_MAX_ZOOM } from "@/lib/explorer/heatmap";
import { subscribeTheme } from "@/lib/theme";

type Status = "cargando" | "listo" | "sinWebgl";
/** Qué se dibuja además de los recorridos: nada, los cuadros de 1 km o los hexágonos H3. */
export type ExplorerLayer = "recorridos" | "cuadros" | "hexagonos";
type CellsNote = "none" | "zoomIn" | "truncated" | "unavailable";

type Bbox = [number, number, number, number];
type CellCollection = components["schemas"]["ExplorationCells"];
type SourceData = Parameters<GeoJSONSource["setData"]>[0];
type TrackFeature = components["schemas"]["ActivityTrack"];

const HEAT = "mapa-de-calor";
const CELLS = "celdas";
const SQUARE = "mayor-cuadrado";
/** Por debajo de estos zooms habría demasiadas celdas en pantalla: se pide acercarse. */
const MIN_CELL_ZOOM: Record<Exclude<ExplorerLayer, "recorridos">, number> = { cuadros: 7, hexagonos: 10 };
const EMPTY = { type: "FeatureCollection", features: [] } as SourceData;

function tilesUrl(query: string): string {
  const base = `${window.location.origin}/api/mapa-de-calor/{z}/{x}/{y}`;
  return query ? `${base}?${query}` : base;
}

/**
 * Recorridos translúcidos: donde se enciman muchos, el color se satura. Más finos lejos y más marcados de cerca.
 */
function drawHeatmap(map: MapLibreMap, query: string, theme: MapTheme) {
  if (map.getSource(HEAT)) return;
  map.addSource(HEAT, { type: "vector", tiles: [tilesUrl(query)], minzoom: 0, maxzoom: HEATMAP_MAX_ZOOM });
  map.addLayer({
    id: HEAT,
    type: "line",
    source: HEAT,
    "source-layer": "recorridos",
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": TRACK_COLORS[theme].line,
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 12, 0.6, 16, 0.7],
      "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 4, 1.2, 12, 2.5, 16, 4.5],
    },
  });
}

/** Celdas debajo de los recorridos: más opacas cuantas más rodadas pasaron por ellas. */
function drawCells(map: MapLibreMap, theme: MapTheme, cells: SourceData, square: SourceData) {
  const color = TRACK_COLORS[theme].line;
  if (!map.getSource(CELLS)) {
    map.addSource(CELLS, { type: "geojson", data: cells });
    map.addLayer(
      {
        id: `${CELLS}-relleno`,
        type: "fill",
        source: CELLS,
        paint: {
          "fill-color": color,
          "fill-opacity": ["interpolate", ["linear"], ["get", "activityCount"], 1, 0.18, 10, 0.5],
        },
      },
      HEAT,
    );
    map.addLayer(
      {
        id: `${CELLS}-borde`,
        type: "line",
        source: CELLS,
        paint: { "line-color": color, "line-opacity": 0.55, "line-width": 0.75 },
      },
      HEAT,
    );
  } else {
    (map.getSource(CELLS) as GeoJSONSource).setData(cells);
  }
  if (!map.getSource(SQUARE)) {
    map.addSource(SQUARE, { type: "geojson", data: square });
    map.addLayer({
      id: SQUARE,
      type: "line",
      source: SQUARE,
      paint: { "line-color": TRACK_COLORS[theme].casing, "line-width": 3, "line-dasharray": [2, 1.5] },
    });
  } else {
    (map.getSource(SQUARE) as GeoJSONSource).setData(square);
  }
}

function squareFeature(bbox: Bbox | null): SourceData {
  if (!bbox) return EMPTY;
  const [w, s, e, n] = bbox;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [w, s],
              [e, s],
              [e, n],
              [w, n],
              [w, s],
            ],
          ],
        },
      },
    ],
  } as SourceData;
}

/** Recuadro (ya recortado por la privacidad) de la rodada que encuadra la vista inicial. */
async function focusBounds(activityId: string): Promise<Bbox | null> {
  const response = await fetch(`/api/actividades/${activityId}/recorrido?zoom=8`, { cache: "no-store" });
  if (!response.ok) return null;
  return ((await response.json()) as TrackFeature).bbox as Bbox;
}

type Props = {
  /** Consulta de filtros para las teselas (`from`, `to`, `subType`, `bikeId`). */
  query: string;
  hasBasemap: boolean;
  /** Rodada más reciente con GPS que cumple los filtros: la vista empieza en su zona. */
  focusActivityId: string | null;
  /** Mayor cuadrado de celdas de 1 km (oeste, sur, este, norte), si existe. */
  largestSquare: Bbox | null;
};

/**
 * Explorador (ADR-017, ADR-018): mapa de calor con las teselas de la API y, a elección, las celdas visitadas. Los
 * inicios y finales llegan ya recortados por la privacidad; nunca se descargan las muestras GPS.
 */
export function ExplorerMap({ query, hasBasemap, focusActivityId, largestSquare }: Props) {
  const t = useTranslations("map");
  const te = useTranslations("explorer");
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const queryRef = useRef(query);
  const layerRef = useRef<ExplorerLayer>("recorridos");
  const refreshCells = useRef<() => void>(() => {});
  const [status, setStatus] = useState<Status>("cargando");
  const [layer, setLayer] = useState<ExplorerLayer>("recorridos");
  const [note, setNote] = useState<CellsNote>("none");
  const groupId = useId();

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let theme = currentTheme();
    let cells: SourceData = EMPTY;
    let request = 0;
    const square = squareFeature(largestSquare);
    const cleanups: (() => void)[] = [];

    async function loadCells(instance: MapLibreMap) {
      const current = layerRef.current;
      const ticket = ++request;
      if (current === "recorridos") {
        cells = EMPTY;
        drawCells(instance, theme, cells, EMPTY);
        setNote("none");
        return;
      }
      drawCells(instance, theme, cells, current === "cuadros" ? square : EMPTY);
      if (instance.getZoom() < MIN_CELL_ZOOM[current]) {
        cells = EMPTY;
        drawCells(instance, theme, cells, current === "cuadros" ? square : EMPTY);
        setNote("zoomIn");
        return;
      }
      const b = instance.getBounds();
      const bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map((n) => n.toFixed(5)).join(",");
      const grid = current === "cuadros" ? "MX1KM" : "H3";
      try {
        const response = await fetch(`/api/exploracion/celdas?grid=${grid}&bbox=${bbox}`, { cache: "no-store" });
        if (cancelled || ticket !== request) return;
        if (!response.ok) {
          setNote("unavailable");
          return;
        }
        const body = (await response.json()) as CellCollection;
        if (cancelled || ticket !== request) return;
        cells = body as unknown as SourceData;
        drawCells(instance, theme, cells, current === "cuadros" ? square : EMPTY);
        setNote(body.truncated ? "truncated" : "none");
      } catch {
        if (!cancelled) setNote("unavailable");
      }
    }

    async function start() {
      if (!container.current) return;
      const created = await createBaseMap({
        container: container.current,
        theme,
        hasBasemap,
        bounds: MEXICO,
        attributionControl: { compact: true },
        cooperativeGestures: true,
        maxZoom: 18,
        locale: mapLocale(t, te("canvasLabel")),
      });
      if (cancelled) {
        created?.map.remove();
        return;
      }
      if (!created) {
        setStatus("sinWebgl");
        return;
      }
      const { maplibre } = created;
      map = created.map;
      const instance = map;
      instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
      instance.addControl(new maplibre.FullscreenControl(), "top-right");
      instance.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");

      const [bounds] = await Promise.all([
        focusActivityId ? focusBounds(focusActivityId).catch(() => null) : Promise.resolve(null),
        new Promise<void>((resolve) => instance.once("load", () => resolve())),
      ]);
      if (cancelled) return;
      if (bounds) {
        instance.fitBounds(bounds, { padding: 48, animate: false, maxZoom: 12 });
      }
      drawHeatmap(instance, queryRef.current, theme);
      drawCells(instance, theme, EMPTY, EMPTY);
      mapRef.current = instance;
      refreshCells.current = () => void loadCells(instance);
      instance.on("moveend", () => void loadCells(instance));
      instance.once("idle", () => !cancelled && setStatus("listo"));

      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onTheme = () => {
        const next = currentTheme();
        if (next === theme) return;
        theme = next;
        instance.setStyle(basemapStyle(theme, window.location.origin, hasBasemap), { diff: false });
        instance.once("style.load", () => {
          drawHeatmap(instance, queryRef.current, theme);
          drawCells(instance, theme, cells, layerRef.current === "cuadros" ? square : EMPTY);
        });
      };
      const unsubscribe = subscribeTheme(onTheme);
      media.addEventListener("change", onTheme);
      cleanups.push(unsubscribe, () => media.removeEventListener("change", onTheme));
    }

    void start();
    const keepalive = window.setInterval(() => void fetch("/api/sesion", { cache: "no-store" }), KEEPALIVE_MS);
    return () => {
      cancelled = true;
      mapRef.current = null;
      refreshCells.current = () => {};
      window.clearInterval(keepalive);
      cleanups.forEach((cleanup) => cleanup());
      map?.remove();
    };
    // La vista inicial solo depende de la primera carga; filtros y capa cambian sin rehacer el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBasemap, t, te]);

  // Filtros nuevos: mismas capas, otras teselas (la vista se conserva).
  useEffect(() => {
    queryRef.current = query;
    const source = mapRef.current?.getSource(HEAT) as VectorTileSource | undefined;
    source?.setTiles([tilesUrl(query)]);
  }, [query]);

  useEffect(() => {
    layerRef.current = layer;
    refreshCells.current();
  }, [layer]);

  const showSquare = () => {
    if (largestSquare && mapRef.current) {
      if (layer !== "cuadros") setLayer("cuadros");
      mapRef.current.fitBounds(largestSquare, { padding: 64, maxZoom: 14 });
    }
  };

  const layers: ExplorerLayer[] = ["recorridos", "cuadros", "hexagonos"];
  return (
    <section aria-labelledby="mapa-de-calor-titulo" className="flex flex-col gap-3">
      <h2 id="mapa-de-calor-titulo" className="sr-only">
        {te("mapLabel")}
      </h2>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="sr-only">{te("layers.legend")}</legend>
          {layers.map((value) => (
            <label key={value} className="inline-flex items-center gap-2 font-medium">
              <input
                type="radio"
                name={`capa-${groupId}`}
                value={value}
                checked={layer === value}
                onChange={() => setLayer(value)}
                className="size-4 accent-acento"
              />
              {te(`layers.${value}`)}
            </label>
          ))}
        </fieldset>
        {largestSquare && (
          <button
            type="button"
            onClick={showSquare}
            className="rounded-md border border-linea bg-superficie px-3 py-1.5 font-medium hover:bg-superficie-hundida"
          >
            {te("showSquare")}
          </button>
        )}
      </div>
      <div className="relative overflow-hidden rounded-lg border border-linea bg-superficie-hundida">
        <div ref={container} data-estado={status} data-capa={layer} className="h-[32rem] w-full lg:h-[40rem]" />
        {status === "sinWebgl" && (
          <p
            role="alert"
            className="absolute inset-0 flex items-center justify-center p-6 text-center text-tinta-suave"
          >
            {t("noWebgl")}
          </p>
        )}
      </div>
      <p role="status" className="min-h-6 text-sm text-tinta-suave">
        {layer !== "recorridos" && note !== "none" ? te(`cells.${note}`) : ""}
        {layer !== "recorridos" && note === "none" ? te("cells.allTime") : ""}
      </p>
      {!hasBasemap && <p className="text-sm text-tinta-suave">{t("noBasemap")}</p>}
    </section>
  );
}
