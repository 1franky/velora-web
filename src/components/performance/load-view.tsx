"use client";

import { useTranslations } from "next-intl";
import { TrendChart } from "./trend-chart";

type Week = {
  start: string;
  end: string;
  load: number;
  activitiesWithHeartRate: number;
  activitiesWithoutHeartRate: number;
};

const NUMBER = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const points = (week: Week) => week.load;
const plain = (value: number) => NUMBER.format(value);

/** Carga estimada por semana: una sola medida, la semana actual destacada como en las tendencias. */
export function LoadView({ weeks }: { weeks: Week[] }) {
  const t = useTranslations("performance.load");
  return (
    <TrendChart
      id="carga-semanal"
      title={t("chart")}
      buckets={weeks}
      granularity="week"
      value={points}
      axis={plain}
      readout={(week) =>
        t("readout", {
          load: NUMBER.format(week.load),
          count: week.activitiesWithHeartRate,
          without: week.activitiesWithoutHeartRate,
        })
      }
      hint={t("hint")}
    />
  );
}
