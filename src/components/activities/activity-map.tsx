"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { components } from "@/lib/api/schema";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { hoverPosition } from "@/lib/activities/hover";
import { TRACK_COLORS, TRACK_SOURCE, basemapStyle, trackZoomFor, type MapTheme } from "@/lib/basemap/style";
import { subscribeTheme } from "@/lib/theme";

type Status = "cargando" | "listo" | "sinRecorrido" | "sinWebgl";

/** Límites de México: vista inicial mientras llega el recorrido (no revela ninguna ubicación del usuario). */
const MEXICO: [number, number, number, number] = [-118.6, 14.3, -86.5, 32.8];
/** Mantiene vigente el access token mientras el mapa pide teselas (esas rutas no pasan por Proxy). */
const KEEPALIVE_MS = 4 * 60 * 1000;

let protocolRegistered = false;

function currentTheme(): MapTheme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

type TrackFeature = components["schemas"]["ActivityTrack"];
type SourceData = Parameters<GeoJSONSource["setData"]>[0];

async function fetchTrack(activityId: string, zoom: number): Promise<TrackFeature | null> {
  const response = await fetch(`/api/actividades/${activityId}/recorrido?zoom=${zoom}`, { cache: "no-store" });
  return response.ok ? ((await response.json()) as TrackFeature) : null;
}

/** Fuente y capas del recorrido; idempotente para volver a agregarlas al cambiar el estilo (tema). */
function drawTrack(map: MapLibreMap, track: TrackFeature, theme: MapTheme) {
  const data = { type: "FeatureCollection", features: [track] } as SourceData;
  const source = map.getSource(TRACK_SOURCE);
  if (source && "setData" in source) {
    (source as GeoJSONSource).setData(data);
    return;
  }
  map.addSource(TRACK_SOURCE, { type: "geojson", data });
  const colors = TRACK_COLORS[theme];
  const layout = { "line-join": "round", "line-cap": "round" } as const;
  map.addLayer({
    id: `${TRACK_SOURCE}-borde`,
    type: "line",
    source: TRACK_SOURCE,
    layout,
    paint: { "line-color": colors.casing, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 4, 16, 9] },
  });
  map.addLayer({
    id: TRACK_SOURCE,
    type: "line",
    source: TRACK_SOURCE,
    layout,
    paint: { "line-color": colors.line, "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2, 16, 5] },
  });
}

const POSITION_SOURCE = "posicion";

/** Punto señalado en las gráficas; idempotente como drawTrack. */
function drawPosition(map: MapLibreMap, theme: MapTheme) {
  const position = hoverPosition.get();
  const data = {
    type: "FeatureCollection",
    features: position ? [{ type: "Feature", geometry: { type: "Point", coordinates: position }, properties: {} }] : [],
  } as SourceData;
  const source = map.getSource(POSITION_SOURCE);
  if (source && "setData" in source) {
    (source as GeoJSONSource).setData(data);
    return;
  }
  map.addSource(POSITION_SOURCE, { type: "geojson", data });
  const colors = TRACK_COLORS[theme];
  map.addLayer({
    id: POSITION_SOURCE,
    type: "circle",
    source: POSITION_SOURCE,
    paint: {
      "circle-radius": 7,
      "circle-color": colors.line,
      "circle-stroke-color": colors.casing,
      "circle-stroke-width": 3,
    },
  });
}

/**
 * Mapa del recorrido (ADR-015). MapLibre se descarga solo aquí. El recorrido simplificado se pide con el zoom
 * actual y se vuelve a pedir con más detalle al acercarse. No se marcan inicio ni fin: revelarían dónde vive o
 * dónde suele salir el usuario (10-security-and-operations.md §3).
 */
type MapProps = {
  activityId: string;
  hasBasemap: boolean;
  /** Vista previa sin interacción (tarjeta de Inicio); `label` la describe para lectores de pantalla. */
  mini?: boolean;
  label?: string;
};

export function ActivityMap({ activityId, hasBasemap, mini = false, label }: MapProps) {
  const t = useTranslations("map");
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("cargando");

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let track: TrackFeature | null = null;
    let fetchedZoom = -1;
    let theme = currentTheme();
    const cleanups: (() => void)[] = [];

    async function start() {
      const [maplibre, { Protocol }] = await Promise.all([import("maplibre-gl"), import("pmtiles")]);
      if (cancelled || !container.current) return;
      if (!protocolRegistered) {
        // Copiado por scripts/vendor-maplibre.mjs: la URL que calcula MapLibre no sobrevive al empaquetado.
        maplibre.setWorkerUrl(`/vendor/maplibre-gl/${maplibre.getVersion()}/maplibre-gl-worker.mjs`);
        maplibre.addProtocol("pmtiles", new Protocol().tile);
        protocolRegistered = true;
      }
      try {
        map = new maplibre.Map({
          container: container.current,
          style: basemapStyle(theme, window.location.origin, hasBasemap),
          bounds: MEXICO,
          attributionControl: { compact: true },
          interactive: !mini,
          cooperativeGestures: !mini,
          maxZoom: 18,
          locale: {
            "NavigationControl.ZoomIn": t("zoomIn"),
            "NavigationControl.ZoomOut": t("zoomOut"),
            "NavigationControl.ResetBearing": t("resetBearing"),
            "FullscreenControl.Enter": t("fullscreenEnter"),
            "FullscreenControl.Exit": t("fullscreenExit"),
            "AttributionControl.ToggleAttribution": t("toggleAttribution"),
            "CooperativeGesturesHandler.WindowsHelpText": t("gestureWindows"),
            "CooperativeGesturesHandler.MacHelpText": t("gestureMac"),
            "CooperativeGesturesHandler.MobileHelpText": t("gestureMobile"),
            "Map.Title": mini && label ? label : t("canvasLabel"),
          },
        });
      } catch {
        setStatus("sinWebgl");
        return;
      }
      const instance = map;
      if (!mini) {
        instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        instance.addControl(new maplibre.FullscreenControl(), "top-right");
        instance.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");
      }

      const loaded = new Promise<void>((resolve) => instance.once("load", () => resolve()));
      const first = await fetchTrack(activityId, 12);
      if (cancelled) return;
      if (!first) {
        setStatus("sinRecorrido");
        return;
      }
      track = first;
      fetchedZoom = 12;
      await loaded;
      if (cancelled) return;
      drawTrack(instance, track, theme);
      // El punto señalado en las gráficas.
      drawPosition(instance, theme);
      cleanups.push(
        hoverPosition.subscribe(() => instance.getSource(POSITION_SOURCE) && drawPosition(instance, theme)),
      );

      // Más detalle al acercarse; al alejarse se conserva el ya descargado.
      const refine = async () => {
        const zoom = trackZoomFor(instance.getZoom());
        if (zoom <= fetchedZoom) return;
        fetchedZoom = zoom;
        const detailed = await fetchTrack(activityId, zoom);
        if (detailed && !cancelled) {
          track = detailed;
          drawTrack(instance, detailed, theme);
        }
      };
      instance.on("moveend", () => void refine());
      instance.fitBounds(track.bbox as [number, number, number, number], {
        padding: mini ? 24 : 48,
        animate: false,
        maxZoom: 16,
      });
      await refine();
      if (cancelled) return;
      instance.once("idle", () => !cancelled && setStatus("listo"));

      // El mapa sigue el tema de la app.
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      const onTheme = () => {
        const next = currentTheme();
        if (next === theme) return;
        theme = next;
        instance.setStyle(basemapStyle(theme, window.location.origin, hasBasemap), { diff: false });
        instance.once("style.load", () => {
          if (track) drawTrack(instance, track, theme);
          drawPosition(instance, theme);
        });
      };
      const unsubscribe = subscribeTheme(onTheme);
      media.addEventListener("change", onTheme);
      // El tema forzado cambia el atributo data-theme; subscribeTheme cubre la elección en Configuración.
      cleanups.push(unsubscribe, () => media.removeEventListener("change", onTheme));
    }

    void start();
    const keepalive = window.setInterval(() => void fetch("/api/sesion", { cache: "no-store" }), KEEPALIVE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(keepalive);
      cleanups.forEach((cleanup) => cleanup());
      map?.remove();
    };
  }, [activityId, hasBasemap, mini, label, t]);

  if (mini) {
    return (
      <div className="relative overflow-hidden rounded-lg border border-linea bg-superficie-hundida">
        <div ref={container} data-estado={status} className="h-48 w-full" />
        {status === "sinWebgl" && <Overlay text={t("noWebgl")} />}
        {status === "sinRecorrido" && <Overlay text={t("trackUnavailable")} />}
      </div>
    );
  }

  return (
    <section aria-labelledby="mapa-titulo" className="flex flex-col gap-2">
      <h2 id="mapa-titulo" className="sr-only">
        {t("label")}
      </h2>
      <div className="relative overflow-hidden rounded-lg border border-linea bg-superficie-hundida">
        <div ref={container} data-estado={status} className="h-[22rem] w-full lg:h-[30rem]" />
        {status === "sinWebgl" && <Overlay text={t("noWebgl")} />}
        {status === "sinRecorrido" && <Overlay text={t("trackUnavailable")} />}
      </div>
      {!hasBasemap && <p className="text-sm text-tinta-suave">{t("noBasemap")}</p>}
    </section>
  );
}

function Overlay({ text }: { text: string }) {
  return (
    <p role="alert" className="absolute inset-0 flex items-center justify-center p-6 text-center text-tinta-suave">
      {text}
    </p>
  );
}
