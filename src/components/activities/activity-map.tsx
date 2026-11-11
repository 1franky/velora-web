"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { components } from "@/lib/api/schema";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { hoverPosition } from "@/lib/activities/hover";
import { KEEPALIVE_MS, MEXICO, createBaseMap, currentTheme, mapLocale } from "@/lib/basemap/client";
import { newTerritory } from "@/lib/activities/new-territory";
import {
  NEW_TERRITORY_COLORS,
  TRACK_COLORS,
  TRACK_SOURCE,
  basemapStyle,
  trackZoomFor,
  type MapTheme,
} from "@/lib/basemap/style";
import { subscribeTheme } from "@/lib/theme";

type Status = "cargando" | "listo" | "sinRecorrido" | "oculto" | "sinWebgl";

type TrackFeature = components["schemas"]["ActivityTrack"];
type SourceData = Parameters<GeoJSONSource["setData"]>[0];

type TrackResult = { ok: true; track: TrackFeature } | { ok: false; hidden: boolean };

async function fetchTrack(activityId: string, zoom: number): Promise<TrackResult> {
  const response = await fetch(`/api/actividades/${activityId}/recorrido?zoom=${zoom}`, { cache: "no-store" });
  if (response.ok) return { ok: true, track: (await response.json()) as TrackFeature };
  const body = (await response.json().catch(() => ({}))) as { error?: string };
  return { ok: false, hidden: body.error === "hidden" };
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

const NEW_SOURCE = "caminos-nuevos";

/**
 * Tramos recorridos por primera vez (ADR-019), encima del recorrido. No se dibujan en la primera rodada: todo sería
 * nuevo. Idempotente como drawTrack.
 */
function drawNewTerritory(map: MapLibreMap, theme: MapTheme) {
  const value = newTerritory.get();
  const data = {
    type: "FeatureCollection",
    features:
      value && value.geometry && !value.firstActivity
        ? [{ type: "Feature", geometry: value.geometry, properties: {} }]
        : [],
  } as SourceData;
  const source = map.getSource(NEW_SOURCE);
  if (source && "setData" in source) {
    (source as GeoJSONSource).setData(data);
    return;
  }
  map.addSource(NEW_SOURCE, { type: "geojson", data });
  map.addLayer(
    {
      id: NEW_SOURCE,
      type: "line",
      source: NEW_SOURCE,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": NEW_TERRITORY_COLORS[theme],
        "line-width": ["interpolate", ["linear"], ["zoom"], 8, 2.5, 16, 6],
      },
    },
    map.getLayer(POSITION_SOURCE) ? POSITION_SOURCE : undefined,
  );
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
  const [trimmed, setTrimmed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: MapLibreMap | undefined;
    let track: TrackFeature | null = null;
    let fetchedZoom = -1;
    let theme = currentTheme();
    const cleanups: (() => void)[] = [];

    async function start() {
      if (cancelled || !container.current) return;
      const created = await createBaseMap({
        container: container.current,
        theme,
        hasBasemap,
        bounds: MEXICO,
        attributionControl: { compact: true },
        interactive: !mini,
        cooperativeGestures: !mini,
        maxZoom: 18,
        locale: mapLocale(t, mini && label ? label : t("canvasLabel")),
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
      if (!mini) {
        instance.addControl(new maplibre.NavigationControl({ showCompass: false }), "top-right");
        instance.addControl(new maplibre.FullscreenControl(), "top-right");
        instance.addControl(new maplibre.ScaleControl({ unit: "metric" }), "bottom-left");
      }

      const loaded = new Promise<void>((resolve) => instance.once("load", () => resolve()));
      const first = await fetchTrack(activityId, 12);
      if (cancelled) return;
      if (!first.ok) {
        setStatus(first.hidden ? "oculto" : "sinRecorrido");
        return;
      }
      track = first.track;
      setTrimmed(first.track.properties.trimmed);
      fetchedZoom = 12;
      await loaded;
      if (cancelled) return;
      drawTrack(instance, track, theme);
      drawNewTerritory(instance, theme);
      cleanups.push(newTerritory.subscribe(() => instance.getSource(NEW_SOURCE) && drawNewTerritory(instance, theme)));
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
        if (detailed.ok && !cancelled) {
          track = detailed.track;
          drawTrack(instance, detailed.track, theme);
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
          drawNewTerritory(instance, theme);
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
        {status === "oculto" && <Overlay text={t("hidden")} />}
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
        {status === "oculto" && <Overlay text={t("hidden")} />}
      </div>
      {trimmed && <p className="text-sm text-tinta-suave">{t("trimmed")}</p>}
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
