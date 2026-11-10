"use client";

import type { ECharts, EChartsCoreOption } from "echarts/core";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { hoverPosition } from "@/lib/activities/hover";
import { nearestIndex, type ChartSeriesKey, type PreparedSeries } from "@/lib/activities/series";
import { formatDuration } from "@/lib/format/units";
import { subscribeTheme } from "@/lib/theme";

type Axis = "distance" | "time";

const LOCALE = "es-MX";
const decimals = (digits: number) =>
  new Intl.NumberFormat(LOCALE, { minimumFractionDigits: digits, maximumFractionDigits: digits });
const NUMBER: Record<ChartSeriesKey, Intl.NumberFormat> = {
  ALTITUDE: decimals(0),
  SPEED: decimals(1),
  HEART_RATE: decimals(0),
  POWER: decimals(0),
  CADENCE: decimals(0),
  TEMPERATURE: decimals(0),
};
const KM = decimals(1);
const PANEL_HEIGHT = 112;

/** Colores leídos de los tokens del tema activo (validados: trazos ≥ 3:1 contra la superficie). */
function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return { line: read("--grafica"), grid: read("--linea"), text: read("--tinta-suave"), ink: read("--tinta") };
}

function subscribeAllThemes(onChange: () => void) {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const unsubscribe = subscribeTheme(onChange);
  media.addEventListener("change", onChange);
  return () => {
    unsubscribe();
    media.removeEventListener("change", onChange);
  };
}

function resolvedTheme() {
  const forced = document.documentElement.dataset.theme;
  if (forced) return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/**
 * Series de la actividad en paneles apilados con un eje compartido (nunca dos escalas en un panel). El cursor se
 * sincroniza entre paneles y con el mapa. El valor señalado se lee en el encabezado de cada panel; sin cursor, el
 * encabezado muestra mínimo y máximo, así ningún dato depende de pasar el cursor.
 */
export function ActivityCharts({ data }: { data: PreparedSeries }) {
  const t = useTranslations("charts");
  const axes: Axis[] = [
    ...(data.distanceKm ? ["distance" as const] : []),
    ...(data.elapsedSeconds ? ["time" as const] : []),
  ];
  const [axis, setAxis] = useState<Axis>(axes[0] ?? "time");
  const [index, setIndex] = useState<number | null>(null);
  const xValues = useMemo(
    () => (axis === "distance" ? data.distanceKm : data.elapsedSeconds) ?? [],
    [axis, data.distanceKm, data.elapsedSeconds],
  );
  const containers = useRef<(HTMLDivElement | null)[]>([]);
  // El tema se observa para repintar; el valor no se usa en el render.
  const themeVersion = useSyncExternalStore(subscribeAllThemes, resolvedTheme, () => "");

  useEffect(() => {
    let cancelled = false;
    const charts: ECharts[] = [];
    const observer = new ResizeObserver(() => charts.forEach((chart) => chart.resize()));

    async function start() {
      const [core, { LineChart }, components, { CanvasRenderer }] = await Promise.all([
        import("echarts/core"),
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers"),
      ]);
      if (cancelled) return;
      core.use([LineChart, components.GridComponent, components.TooltipComponent, CanvasRenderer]);
      const colors = themeColors();
      const xMax = Math.max(...xValues.filter((x): x is number => x !== null));
      const group = `actividad-${Math.random().toString(36).slice(2)}`;

      data.series.forEach((series, i) => {
        const element = containers.current[i];
        if (!element) return;
        const chart = core.init(element, undefined, { renderer: "canvas", locale: "EN" });
        const last = i === data.series.length - 1;
        const points = xValues.flatMap((x, j) => (x === null ? [] : [[x, series.values[j]]]));
        const option: EChartsCoreOption = {
          animation: false,
          // Mismo rectángulo de datos en todos los paneles: ECharts 6 encoge el grid para que quepan las etiquetas
          // del eje x, y el cursor quedaría corrido en el último panel.
          grid: { left: 52, right: 28, top: 10, bottom: last ? 28 : 8, outerBoundsMode: "none" },
          xAxis: {
            type: "value",
            min: 0,
            max: xMax,
            axisLabel: {
              show: last,
              color: colors.text,
              formatter: (value: number) => (axis === "distance" ? `${KM.format(value)} km` : formatDuration(value)),
            },
            axisLine: { lineStyle: { color: colors.grid } },
            axisTick: { show: false },
            splitLine: { show: false },
          },
          yAxis: {
            type: "value",
            scale: series.key === "ALTITUDE" || series.key === "TEMPERATURE",
            splitNumber: 2,
            axisLabel: { color: colors.text, formatter: (value: number) => NUMBER[series.key].format(value) },
            splitLine: { lineStyle: { color: colors.grid, width: 1, type: "solid" } },
          },
          tooltip: {
            trigger: "axis",
            showContent: false,
            axisPointer: {
              type: "line",
              snap: false,
              lineStyle: { color: colors.ink, width: 1, type: "solid" },
              label: { show: false },
            },
          },
          series: [
            {
              type: "line",
              data: points,
              showSymbol: false,
              connectNulls: false,
              lineStyle: { width: 2, color: colors.line, cap: "round", join: "round" },
              itemStyle: { color: colors.line },
              areaStyle: series.key === "ALTITUDE" ? { color: colors.line, opacity: 0.1 } : undefined,
              emphasis: { disabled: true },
            },
          ],
        };
        chart.setOption(option);
        chart.group = group;
        chart.on("updateAxisPointer", (event: unknown) => {
          const value = (event as { axesInfo?: { value?: number }[] }).axesInfo?.[0]?.value;
          if (value === undefined) return;
          const nearest = nearestIndex(xValues, value);
          setIndex(nearest);
          hoverPosition.set(data.positions?.[nearest] ?? null);
        });
        chart.getZr().on("globalout", () => {
          setIndex(null);
          hoverPosition.set(null);
        });
        observer.observe(element);
        charts.push(chart);
      });
      core.connect(group);
    }

    void start();
    return () => {
      cancelled = true;
      observer.disconnect();
      charts.forEach((chart) => chart.dispose());
      hoverPosition.set(null);
    };
  }, [axis, data, xValues, themeVersion]);

  const value = (key: ChartSeriesKey, raw: number | null) =>
    raw === null ? t("noValue") : t(`units.${key}`, { value: NUMBER[key].format(raw) });
  const at =
    index === null
      ? null
      : axis === "distance"
        ? t("atDistance", { km: KM.format(data.distanceKm?.[index] ?? 0) })
        : t("atTime", { time: formatDuration(data.elapsedSeconds?.[index] ?? 0) });

  return (
    <section aria-labelledby="graficas-titulo" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="graficas-titulo" className="text-2xl font-semibold">
          {t("title")}
        </h2>
        {axes.length > 1 && (
          <fieldset className="flex rounded-md border border-linea bg-superficie p-0.5 text-sm">
            <legend className="sr-only">{t("axis")}</legend>
            {axes.map((option) => (
              <label
                key={option}
                className="cursor-pointer rounded px-3 py-1 font-medium text-tinta-suave has-checked:bg-superficie-hundida has-checked:text-tinta has-focus-visible:outline-3 has-focus-visible:outline-acento-medio"
              >
                <input
                  type="radio"
                  name="eje"
                  value={option}
                  checked={axis === option}
                  onChange={() => setAxis(option)}
                  className="sr-only"
                />
                {t(`axes.${option}`)}
              </label>
            ))}
          </fieldset>
        )}
      </div>
      <p className="cifras min-h-6 text-sm text-tinta-suave">{at ?? t("hint")}</p>
      <div className="flex flex-col divide-y divide-linea rounded-lg border border-linea bg-superficie">
        {data.series.map((series, i) => (
          <figure key={series.key} className="flex flex-col px-3 pt-3 pb-1">
            <figcaption className="cifras flex flex-wrap items-baseline justify-between gap-x-4 px-1 text-sm">
              <span className="font-semibold text-tinta">{t(`series.${series.key}`)}</span>
              {index === null ? (
                <span className="text-tinta-suave">
                  {t("range", { min: value(series.key, series.min), max: value(series.key, series.max) })}
                </span>
              ) : (
                <strong className="font-semibold text-tinta">{value(series.key, series.values[index] ?? null)}</strong>
              )}
            </figcaption>
            <div
              ref={(element) => {
                containers.current[i] = element;
              }}
              aria-hidden
              style={{ height: PANEL_HEIGHT + (i === data.series.length - 1 ? 20 : 0) }}
            />
          </figure>
        ))}
      </div>
    </section>
  );
}
