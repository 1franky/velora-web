"use client";

import type { ECharts, EChartsCoreOption } from "echarts/core";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { DashboardSummary } from "@/lib/activities/data";
import { formatDistance, formatDuration, formatElevation } from "@/lib/format/units";
import { resolvedTheme, subscribeResolvedTheme } from "@/lib/theme";

type Month = DashboardSummary["monthlyTrend"][number];

const LOCALE = "es-MX";
const shortMonth = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });
const longMonth = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });
const KM = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });

const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);
const short = (month: string) => shortMonth.format(monthDate(month)).replace(".", "");

function themeColors() {
  const style = getComputedStyle(document.documentElement);
  const read = (name: string) => style.getPropertyValue(name).trim();
  return {
    current: read("--grafica"),
    context: read("--grafica-tenue"),
    grid: read("--linea"),
    text: read("--tinta-suave"),
    ink: read("--tinta"),
    hover: read("--superficie-hundida"),
  };
}

/**
 * Distancia por mes de los últimos 12 meses. El mes actual va en cempasúchil, con su valor escrito y su etiqueta en
 * negritas (no solo color); los demás en gris de contexto. Los mismos datos están en una tabla.
 */
export function MonthlyTrend({ months }: { months: Month[] }) {
  const t = useTranslations("home.trend");
  const tt = useTranslations("home.totals");
  const container = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const theme = useSyncExternalStore(subscribeResolvedTheme, resolvedTheme, () => "light");
  const last = months.length - 1;

  useEffect(() => {
    let cancelled = false;
    let chart: ECharts | undefined;
    const observer = new ResizeObserver(() => chart?.resize());

    async function start() {
      const [core, { BarChart }, components, { CanvasRenderer }] = await Promise.all([
        import("echarts/core"),
        import("echarts/charts"),
        import("echarts/components"),
        import("echarts/renderers"),
      ]);
      if (cancelled || !container.current) return;
      core.use([BarChart, components.GridComponent, components.TooltipComponent, CanvasRenderer]);
      const colors = themeColors();
      const every = container.current.clientWidth < 480 ? 3 : 1;
      chart = core.init(container.current, undefined, { renderer: "canvas" });
      const option: EChartsCoreOption = {
        animation: false,
        grid: { left: 44, right: 8, top: 28, bottom: 28, outerBoundsMode: "none" },
        xAxis: {
          type: "category",
          data: months.map((m) => short(m.month)),
          axisTick: { show: false },
          axisLine: { lineStyle: { color: colors.grid } },
          axisLabel: {
            color: colors.text,
            // Contando desde el mes actual: su etiqueta nunca se oculta; en pantallas angostas, uno de cada tres.
            interval: (i: number) => (last - i) % every === 0,
            formatter: (value: string, i: number) => (i === last ? `{actual|${value}}` : value),
            rich: { actual: { color: colors.ink, fontWeight: "bold" } },
          },
        },
        yAxis: {
          type: "value",
          splitNumber: 3,
          axisLabel: { color: colors.text, formatter: (value: number) => KM.format(value) },
          splitLine: { lineStyle: { color: colors.grid, width: 1, type: "solid" } },
        },
        tooltip: {
          trigger: "axis",
          showContent: false,
          // z bajo: la sombra va detrás de las barras y no altera su color.
          axisPointer: { type: "shadow", z: 0, shadowStyle: { color: colors.hover, opacity: 0.6 } },
        },
        series: [
          {
            type: "bar",
            barMaxWidth: 24,
            data: months.map((m, i) => ({
              value: m.distanceMeters / 1000,
              itemStyle: { color: i === last ? colors.current : colors.context, borderRadius: [4, 4, 0, 0] },
              label: {
                show: i === last,
                position: "top",
                color: colors.ink,
                fontWeight: "bold",
                formatter: () => `${KM.format(m.distanceMeters / 1000)} km`,
              },
            })),
            emphasis: { disabled: true },
          },
        ],
      };
      chart.setOption(option);
      chart.on("updateAxisPointer", (event: unknown) => {
        const value = (event as { axesInfo?: { value?: number }[] }).axesInfo?.[0]?.value;
        setIndex(typeof value === "number" ? value : null);
      });
      chart.getZr().on("globalout", () => setIndex(null));
      observer.observe(container.current);
    }

    void start();
    return () => {
      cancelled = true;
      observer.disconnect();
      chart?.dispose();
    };
  }, [months, last, theme]);

  const shown = index === null ? null : months[index];

  return (
    <section aria-labelledby="tendencia-titulo" className="flex flex-col gap-3">
      <h2 id="tendencia-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      <p className="cifras min-h-6 text-sm text-tinta-suave">
        {shown
          ? t("readout", {
              month: longMonth.format(monthDate(shown.month)),
              distance: formatDistance(shown.distanceMeters),
              count: shown.activityCount,
            })
          : t("hint")}
      </p>
      <div className="rounded-lg border border-linea bg-superficie p-3">
        <div ref={container} aria-hidden className="h-56 w-full" />
      </div>
      <details className="group">
        <summary className="cursor-pointer self-start font-medium text-acento underline underline-offset-4">
          {t("table")}
        </summary>
        <div className="mt-3 overflow-x-auto rounded-lg border border-linea bg-superficie">
          <table className="cifras w-full border-collapse text-left">
            <caption className="sr-only">{t("caption")}</caption>
            <thead className="border-b border-linea text-sm text-tinta-suave">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t("month")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {tt("distance")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {tt("count")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {tt("movingTime")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {tt("elevation")}
                </th>
              </tr>
            </thead>
            <tbody>
              {months.map((m) => (
                <tr key={m.month} className="border-b border-linea last:border-0">
                  <th scope="row" className="px-4 py-2 font-medium capitalize">
                    {longMonth.format(monthDate(m.month))}
                  </th>
                  <td className="px-4 py-2 text-right">{formatDistance(m.distanceMeters)}</td>
                  <td className="px-4 py-2 text-right">{m.activityCount}</td>
                  <td className="px-4 py-2 text-right">{formatDuration(m.movingTimeSeconds)}</td>
                  <td className="px-4 py-2 text-right">{formatElevation(m.elevationGainMeters)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
