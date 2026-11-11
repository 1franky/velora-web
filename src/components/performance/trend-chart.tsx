"use client";

import type { ECharts, EChartsCoreOption } from "echarts/core";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { longLabel, shortLabel, type TimeseriesQuery } from "@/lib/performance/trends";
import { resolvedTheme, subscribeResolvedTheme } from "@/lib/theme";

type Bucket = {
  start: string;
  end: string;
  activityCount: number;
  distanceMeters: number;
  elevationGainMeters: number;
};

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

type Props = {
  title: string;
  id: string;
  buckets: Bucket[];
  granularity: TimeseriesQuery["granularity"];
  /** Valor de cada periodo en la unidad del eje (km o m). */
  value: (bucket: Bucket) => number;
  /** Número del eje, sin unidad. */
  axis: (value: number) => string;
  /** Lectura del periodo señalado: "37 km en 3 rodadas". */
  readout: (bucket: Bucket) => string;
  hint: string;
};

/**
 * Una sola medida por gráfica (sin doble eje). El periodo en curso, el último, va en cempasúchil con su valor escrito
 * y su etiqueta en negritas; los demás en gris de contexto. La tabla de Rendimiento tiene los mismos datos.
 */
export function TrendChart({ title, id, buckets, granularity, value, axis, readout, hint }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const theme = useSyncExternalStore(subscribeResolvedTheme, resolvedTheme, () => "light");
  const last = buckets.length - 1;

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
      const width = container.current.clientWidth;
      // Etiquetas que caben: contando desde el periodo actual, que nunca se oculta.
      const every = Math.max(1, Math.ceil((buckets.length * 44) / Math.max(width - 52, 1)));
      chart = core.init(container.current, undefined, { renderer: "canvas" });
      const option: EChartsCoreOption = {
        animation: false,
        grid: { left: 48, right: 8, top: 28, bottom: 28, outerBoundsMode: "none" },
        xAxis: {
          type: "category",
          data: buckets.map((b) => shortLabel(b.start, granularity)),
          axisTick: { show: false },
          axisLine: { lineStyle: { color: colors.grid } },
          axisLabel: {
            color: colors.text,
            interval: (i: number) => (last - i) % every === 0,
            formatter: (label: string, i: number) => (i === last ? `{actual|${label}}` : label),
            rich: { actual: { color: colors.ink, fontWeight: "bold" } },
          },
        },
        yAxis: {
          type: "value",
          splitNumber: 3,
          axisLabel: { color: colors.text, formatter: axis },
          splitLine: { lineStyle: { color: colors.grid, width: 1, type: "solid" } },
        },
        tooltip: {
          trigger: "axis",
          showContent: false,
          axisPointer: { type: "shadow", z: 0, shadowStyle: { color: colors.hover, opacity: 0.6 } },
        },
        series: [
          {
            type: "bar",
            barMaxWidth: 24,
            data: buckets.map((b, i) => ({
              value: value(b),
              itemStyle: { color: i === last ? colors.current : colors.context, borderRadius: [4, 4, 0, 0] },
              label: {
                show: i === last && value(b) > 0,
                position: "top",
                color: colors.ink,
                fontWeight: "bold",
                formatter: () => axis(value(b)),
              },
            })),
            emphasis: { disabled: true },
          },
        ],
      };
      chart.setOption(option);
      chart.on("updateAxisPointer", (event: unknown) => {
        const pointed = (event as { axesInfo?: { value?: number }[] }).axesInfo?.[0]?.value;
        setIndex(typeof pointed === "number" ? pointed : null);
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
  }, [buckets, granularity, last, theme, value, axis]);

  const shown = index === null ? null : buckets[index];
  return (
    <figure aria-labelledby={`${id}-titulo`} className="flex flex-col gap-2">
      <figcaption id={`${id}-titulo`} className="text-lg font-semibold">
        {title}
      </figcaption>
      <p className="cifras min-h-6 text-sm text-tinta-suave">
        {shown ? `${longLabel(shown.start, shown.end, granularity)}: ${readout(shown)}` : hint}
      </p>
      <div className="rounded-lg border border-linea bg-superficie p-3">
        <div ref={container} aria-hidden className="h-56 w-full" />
      </div>
    </figure>
  );
}
