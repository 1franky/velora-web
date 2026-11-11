import { getFormatter, getTranslations } from "next-intl/server";
import type { ExplorationSummary, LargestSquare } from "@/lib/explorer/data";

/**
 * Cuánto territorio has cubierto, en dos sistemas que no se comparan entre sí (ADR-018): cuadros de 1 km (superficie
 * exacta) y hexágonos H3 (aproximada). Incluye todo el historial: los filtros solo cambian las líneas del mapa.
 */
export async function ExplorationStats({
  summary,
  square,
}: {
  summary: ExplorationSummary;
  square: LargestSquare | null;
}) {
  const t = await getTranslations("explorer.stats");
  const format = await getFormatter();
  const number = (value: number, digits = 0) => format.number(value, { maximumFractionDigits: digits });
  const items = [
    {
      term: t("squares"),
      value: number(summary.metricGrid.cellCount),
      hint: t("squaresHint", { area: number(summary.metricGrid.areaKm2) }),
    },
    {
      term: t("largestSquare"),
      value: square && square.size > 0 ? t("squareValue", { size: square.size }) : "—",
      hint: square && square.size > 0 ? t("squareHint", { area: number(square.size * square.size) }) : t("noSquare"),
    },
    {
      term: t("hexagons"),
      value: number(summary.h3.cellCount),
      hint: t("hexagonsHint", { area: number(summary.h3.approxAreaKm2, 1) }),
    },
  ];
  return (
    <section aria-labelledby="exploracion-titulo" className="flex flex-col gap-3">
      <h2 id="exploracion-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      <dl className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <div key={item.term} className="flex flex-col gap-1 rounded-lg border border-linea bg-superficie p-4">
            <dt className="text-sm font-medium text-tinta-suave">{item.term}</dt>
            <dd className="cifras text-3xl font-bold">{item.value}</dd>
            <dd className="text-sm text-tinta-suave">{item.hint}</dd>
          </div>
        ))}
      </dl>
      <p className="max-w-prose text-sm text-tinta-suave">
        {summary.pendingActivities > 0 ? t("pending", { count: summary.pendingActivities }) : t("allTime")}
      </p>
    </section>
  );
}
