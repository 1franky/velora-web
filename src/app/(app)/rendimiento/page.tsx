import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { TrendsView } from "@/components/performance/trends-view";
import { SUB_TYPES } from "@/lib/activities/filters";
import { listBikes } from "@/lib/activities/data";
import { formatDistance, formatDuration, formatElevation } from "@/lib/format/units";
import { getTimeseries } from "@/lib/performance/data";
import {
  GROUPINGS,
  longLabel,
  parsePerformance,
  toTimeseriesQuery,
  type PerformanceOptions,
} from "@/lib/performance/trends";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("rendimiento") };
}

export default async function PerformancePage({ searchParams }: PageProps<"/rendimiento">) {
  const t = await getTranslations("performance");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-prose text-tinta-suave">{t("intro")}</p>
      </div>
      <Suspense fallback={<div aria-hidden className="h-[28rem] animate-pulse rounded-lg bg-superficie-hundida" />}>
        <Trends searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const field = "rounded-md border border-linea bg-superficie px-3 py-2 text-base";

async function Trends({ searchParams }: { searchParams: PageProps<"/rendimiento">["searchParams"] }) {
  const options = parsePerformance(await searchParams);
  const query = toTimeseriesQuery(options);
  const [t, ta, bikes, result] = await Promise.all([
    getTranslations("performance"),
    getTranslations("activities"),
    listBikes(),
    getTimeseries(query),
  ]);
  const key = JSON.stringify(options);

  return (
    <>
      <Options key={key} options={options} bikes={bikes.map(({ id, name }) => ({ id, name }))} />
      {!result.ok ? (
        <p role="alert" className="font-medium text-negativo">
          {ta(`errors.${result.error}`)}
        </p>
      ) : (
        <>
          <section aria-labelledby="totales-titulo" className="flex flex-col gap-3">
            <h2 id="totales-titulo" className="text-2xl font-semibold">
              {t(`range.${query.granularity}`, { count: result.data.buckets.length })}
            </h2>
            <dl className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { term: t("totals.distance"), value: formatDistance(result.data.totals.distanceMeters) },
                { term: t("totals.movingTime"), value: formatDuration(result.data.totals.movingTimeSeconds) },
                { term: t("totals.elevation"), value: formatElevation(result.data.totals.elevationGainMeters) },
                { term: t("totals.count"), value: String(result.data.totals.activityCount) },
              ].map((item) => (
                <div key={item.term} className="flex flex-col gap-1 rounded-lg border border-linea bg-superficie p-4">
                  <dt className="text-sm font-medium text-tinta-suave">{item.term}</dt>
                  <dd className="cifras text-2xl font-bold">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="text-sm text-tinta-suave">
              {options.rodillo ? t("indoorIncluded") : t("indoorExcluded")}{" "}
              {t("sources", {
                device: result.data.distanceSources.deviceReported,
                derived: result.data.distanceSources.derived,
              })}
            </p>
            {result.data.duplicatesExcluded > 0 && (
              <p role="status" className="rounded-lg border border-acento-medio bg-superficie px-4 py-3">
                {t("duplicates", { count: result.data.duplicatesExcluded })}{" "}
                <Link href="/actividades" className="font-semibold text-acento underline underline-offset-4">
                  {t("duplicatesLink")}
                </Link>
              </p>
            )}
          </section>
          <TrendsView buckets={result.data.buckets} granularity={query.granularity} />
          <details>
            <summary className="cursor-pointer font-medium text-acento underline underline-offset-4">
              {t("table.toggle")}
            </summary>
            <div className="mt-3 overflow-x-auto rounded-lg border border-linea bg-superficie">
              <table className="cifras w-full border-collapse text-left">
                <caption className="sr-only">{t("table.caption")}</caption>
                <thead className="border-b border-linea text-sm text-tinta-suave">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      {t("table.period")}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {t("totals.distance")}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {t("totals.count")}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {t("totals.movingTime")}
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      {t("totals.elevation")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.data.buckets.toReversed().map((b) => (
                    <tr key={b.start} className="border-b border-linea last:border-0">
                      <th scope="row" className="px-4 py-2 font-medium">
                        {longLabel(b.start, b.end, query.granularity)}
                      </th>
                      <td className="px-4 py-2 text-right">{formatDistance(b.distanceMeters)}</td>
                      <td className="px-4 py-2 text-right">{b.activityCount}</td>
                      <td className="px-4 py-2 text-right">{formatDuration(b.movingTimeSeconds)}</td>
                      <td className="px-4 py-2 text-right">{formatElevation(b.elevationGainMeters)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </>
  );
}

async function Options({ options, bikes }: { options: PerformanceOptions; bikes: { id: string; name: string }[] }) {
  const t = await getTranslations("performance.options");
  const ta = await getTranslations("activities");
  return (
    <form
      method="get"
      action="/rendimiento"
      aria-label={t("label")}
      className="flex flex-wrap items-end gap-x-4 gap-y-3 rounded-lg border border-linea bg-superficie p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("grouping")}
        <select name="por" defaultValue={options.por} className={field}>
          {GROUPINGS.map((value) => (
            <option key={value} value={value}>
              {t(`groupings.${value}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {ta("filters.type")}
        <select name="tipo" defaultValue={options.tipo ?? ""} className={field}>
          <option value="">{ta("filters.anyType")}</option>
          {SUB_TYPES.map((type) => (
            <option key={type} value={type}>
              {ta(`types.${type}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {ta("filters.bike")}
        <select name="bici" defaultValue={options.bici ?? ""} className={field} disabled={bikes.length === 0}>
          <option value="">{ta("filters.anyBike")}</option>
          {bikes.map((bike) => (
            <option key={bike.id} value={bike.id}>
              {bike.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 py-2 font-medium">
        <input
          type="checkbox"
          name="rodillo"
          value="1"
          defaultChecked={options.rodillo}
          className="size-4 accent-acento"
        />
        {t("indoor")}
      </label>
      <button
        type="submit"
        className="rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110"
      >
        {t("apply")}
      </button>
    </form>
  );
}
