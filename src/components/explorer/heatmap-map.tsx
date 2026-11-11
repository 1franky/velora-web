"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapLibreMap, VectorTileSource } from "maplibre-gl";
import type { components } from "@/lib/api/schema";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { KEEPALIVE_MS, MEXICO, createBaseMap, currentTheme, mapLocale } from "@/lib/basemap/client";
import { TRACK_COLORS, basemapStyle, type MapTheme } from "@/lib/basemap/style";
import { HEATMAP_MAX_ZOOM } from "@/lib/explorer/heatmap";
import { subscribeTheme } from "@/lib/theme";

type Status = "cargando" | "listo" | "sinWebgl";

const SOURCE = "mapa-de-calor";
/** Capa dentro de cada tesela (contrato). */
const SOURCE_LAYER = "recorridos";

function tilesUrl(query: string): string {
  const base = `${window.location.origin}/api/mapa-de-calor/{z}/{x}/{y}`;
  return query ? `${base}?${query}` : base;
}

/**
 * Recorridos translúcidos: donde se enciman muchos, el color se satura. Más finos y tenues lejos (miles de líneas)
 * y más marcados de cerca, donde ya se distinguen los caminos.
 */
function drawHeatmap(map: MapLibreMap, query: string, theme: MapTheme) {
  if (map.getSource(SOURCE)) return;
  map.addSource(SOURCE, {
    type: "vector",
    tiles: [tilesUrl(query)],
    minzoom: 0,
    maxzoom: HEATMAP_MAX_ZOOM,
  });
  map.addLayer({
    id: SOURCE,
    type: "line",
    source: SOURCE,
    "source-layer": SOURCE_LAYER,
    layout: { "line-join": "round", "line-cap": "round" },
    paint: {
      "line-color": TRACK_COLORS[theme].line,
      "line-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.5, 12, 0.6, 16, 0.7],
      "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 4, 1.2, 12, 2.5, 16, 4.5],
    },
  });
}

type TrackFeature = components["schemas"]["ActivityTrack"];

/** Recuadro (ya recortado por la privacidad) de la rodada que encuadra la vista inicial. */
async function focusBounds(activityId: string): Promise<[number, number, number, number] | null> {
  const response = await fetch(`/api/actividades/${activityId}/recorrido?zoom=8`, { cache: "no-store" });
  if (!response.ok) return null;
  return ((await response.json()) as TrackFeature).bbox as [number, number, number, number];
}

type Props = {
  /** Consulta de filtros para las teselas (`from`, `to`, `subType`, `bikeId`). */
  query: string;
  hasBasemap: boolean;
  /** Rodada más reciente con GPS que cumple los filtros: la vista empieza en su zona. */
  focusActivityId: string | null;
};

/**
 * Mapa de calor personal (ADR-017): teselas vectoriales generadas por la API, con los inicios y finales ya
 * recortados según la privacidad. Nunca se descargan las muestras GPS.
 */
export function HeatmapMap({ query, hasBasemap, focusActivityId }: Props) {
  const t = useTranslations("map");
  const te = useTranslations("explorer");
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const queryRef = useRef(query);
  const [status, setStatus] = useState<Status>("cargando");

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let theme = currentTheme();
    const cleanups: (() => void)[] = [];

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
      mapRef.current = instance;
      instance.once("idle", () => !cancelled && setStatus("listo"));

      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onTheme = () => {
        const next = currentTheme();
        if (next === theme) return;
        theme = next;
        instance.setStyle(basemapStyle(theme, window.location.origin, hasBasemap), { diff: false });
        instance.once("style.load", () => drawHeatmap(instance, queryRef.current, theme));
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
      window.clearInterval(keepalive);
      cleanups.forEach((cleanup) => cleanup());
      map?.remove();
    };
    // La vista inicial solo depende de la primera carga; los filtros cambian las teselas sin rehacer el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBasemap, t, te]);

  // Filtros nuevos: mismas capas, otras teselas (la vista se conserva).
  useEffect(() => {
    queryRef.current = query;
    const source = mapRef.current?.getSource(SOURCE) as VectorTileSource | undefined;
    source?.setTiles([tilesUrl(query)]);
  }, [query]);

  return (
    <section aria-labelledby="mapa-de-calor-titulo" className="flex flex-col gap-2">
      <h2 id="mapa-de-calor-titulo" className="sr-only">
        {te("mapLabel")}
      </h2>
      <div className="relative overflow-hidden rounded-lg border border-linea bg-superficie-hundida">
        <div ref={container} data-estado={status} className="h-[32rem] w-full lg:h-[40rem]" />
        {status === "sinWebgl" && (
          <p
            role="alert"
            className="absolute inset-0 flex items-center justify-center p-6 text-center text-tinta-suave"
          >
            {t("noWebgl")}
          </p>
        )}
      </div>
      {!hasBasemap && <p className="text-sm text-tinta-suave">{t("noBasemap")}</p>}
    </section>
  );
}
