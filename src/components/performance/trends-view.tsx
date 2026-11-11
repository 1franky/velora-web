"use client";

import { useTranslations } from "next-intl";
import type { TimeseriesQuery } from "@/lib/performance/trends";
import { formatDistance, formatElevation } from "@/lib/format/units";
import { TrendChart } from "./trend-chart";

type Bucket = {
  start: string;
  end: string;
  activityCount: number;
  distanceMeters: number;
  elevationGainMeters: number;
};

const NUMBER = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const kilometers = (b: Bucket) => b.distanceMeters / 1000;
const meters = (b: Bucket) => b.elevationGainMeters;
const plain = (value: number) => NUMBER.format(value);

/** Distancia y desnivel por periodo: dos gráficas, una medida cada una (nunca dos ejes en la misma). */
export function TrendsView({
  buckets,
  granularity,
}: {
  buckets: Bucket[];
  granularity: TimeseriesQuery["granularity"];
}) {
  const t = useTranslations("performance.charts");
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <TrendChart
        id="distancia"
        title={t("distance")}
        buckets={buckets}
        granularity={granularity}
        value={kilometers}
        axis={plain}
        readout={(b) => t("distanceReadout", { distance: formatDistance(b.distanceMeters), count: b.activityCount })}
        hint={t("hint")}
      />
      <TrendChart
        id="desnivel"
        title={t("elevation")}
        buckets={buckets}
        granularity={granularity}
        value={meters}
        axis={plain}
        readout={(b) => t("elevationReadout", { elevation: formatElevation(b.elevationGainMeters) })}
        hint={t("hint")}
      />
    </div>
  );
}
