import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { keepActivityAction } from "@/app/(app)/actividades/[id]/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { getActivity, type ActivityDetail } from "@/lib/activities/data";
import { CHART_SERIES } from "@/lib/activities/series";
import {
  MISSING,
  formatDistance,
  formatDuration,
  formatElevation,
  formatFileSize,
  formatInstantTime,
  formatSpeed,
  formatWeekdayDate,
} from "@/lib/format/units";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("compare"))("title") };
}

export default async function ComparePage({ searchParams }: PageProps<"/actividades/comparar">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-lg bg-superficie-hundida" />}>
        <Comparison searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Cuánta información trae: series registradas más el recorrido. Sirve para sugerir cuál conservar. */
function richness(activity: ActivityDetail) {
  return activity.streamTypes.length + (activity.hasTrack ? 1 : 0) + activity.lapCount;
}

async function Comparison({ searchParams }: { searchParams: PageProps<"/actividades/comparar">["searchParams"] }) {
  const { a, b } = await searchParams;
  if (typeof a !== "string" || typeof b !== "string" || !UUID.test(a) || !UUID.test(b) || a === b) notFound();
  const [first, second, t, tc] = await Promise.all([
    getActivity(a),
    getActivity(b),
    getTranslations("compare"),
    getTranslations("charts"),
  ]);
  if (!first.ok || !second.ok) {
    if ((!first.ok && first.error === "notFound") || (!second.ok && second.error === "notFound")) notFound();
    return (
      <p role="alert" className="font-medium text-negativo">
        {t("unavailable")}
      </p>
    );
  }
  const pair = [first.data, second.data] as const;
  const [ra, rb] = pair.map(richness);
  const richer = ra === rb ? null : ra > rb ? 0 : 1;
  const unit = (value: number | null, suffix: string) => (value == null ? MISSING : `${value} ${suffix}`);
  const series = (activity: ActivityDetail) => {
    const names = CHART_SERIES.filter((key) => activity.streamTypes.includes(key)).map((key) => tc(`series.${key}`));
    return names.length ? names.join(", ") : MISSING;
  };

  const rows: { label: string; value: (activity: ActivityDetail) => string }[] = [
    {
      label: t("file"),
      value: (x) => `${x.originalFile.format}, ${formatFileSize(x.originalFile.sizeBytes)}`,
    },
    {
      label: t("start"),
      value: (x) => `${formatWeekdayDate(x.localStartDate)}, ${formatInstantTime(x.startedAt, x.timeZone)}`,
    },
    { label: t("distance"), value: (x) => formatDistance(x.distanceMeters) },
    { label: t("movingTime"), value: (x) => formatDuration(x.movingTimeSeconds) },
    { label: t("elapsedTime"), value: (x) => formatDuration(x.elapsedTimeSeconds) },
    { label: t("elevationGain"), value: (x) => formatElevation(x.elevationGainMeters) },
    { label: t("averageSpeed"), value: (x) => formatSpeed(x.averageSpeedMps) },
    { label: t("averageHeartRate"), value: (x) => unit(x.averageHeartRateBpm, "ppm") },
    { label: t("averagePower"), value: (x) => unit(x.averagePowerWatts, "W") },
    { label: t("averageCadence"), value: (x) => unit(x.averageCadenceRpm, "rpm") },
    { label: t("track"), value: (x) => (x.hasTrack ? t("yes") : t("no")) },
    { label: t("series"), value: series },
    { label: t("laps"), value: (x) => String(x.lapCount) },
  ];

  return (
    <>
      <Link
        href={`/actividades/${a}`}
        className="inline-flex items-center gap-1.5 self-start font-medium text-tinta-suave hover:text-tinta"
      >
        <ArrowLeft aria-hidden size={18} strokeWidth={2} />
        {t("back", { title: pair[0].title })}
      </Link>
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-tinta-suave">{t("intro")}</p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
        <table className="cifras w-full border-collapse text-left">
          <caption className="sr-only">{t("caption")}</caption>
          <thead className="border-b border-linea">
            <tr>
              <td className="w-1/4 px-4 py-3" />
              {pair.map((activity, i) => (
                <th key={activity.id} scope="col" className="px-4 py-3 align-bottom">
                  <span className="flex flex-col gap-1">
                    {richer === i && (
                      <span className="self-start rounded bg-superficie-hundida px-1.5 py-0.5 text-sm font-medium text-tinta-suave">
                        {t("richer")}
                      </span>
                    )}
                    <Link href={`/actividades/${activity.id}`} className="font-semibold hover:underline">
                      {activity.title}
                    </Link>
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const values = pair.map(row.value);
              return (
                <tr key={row.label} className="border-b border-linea last:border-0">
                  <th scope="row" className="px-4 py-2.5 text-sm font-medium text-tinta-suave">
                    {row.label}
                  </th>
                  {values.map((value, i) => (
                    <td
                      key={pair[i].id}
                      className={`px-4 py-2.5 ${values[0] !== values[1] ? "font-semibold" : "text-tinta-suave"}`}
                    >
                      {value}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-tinta-suave">{t("differencesHint")}</p>

      <section aria-labelledby="resolver-titulo" className="flex flex-col gap-3">
        <h2 id="resolver-titulo" className="text-2xl font-semibold">
          {t("resolveTitle")}
        </h2>
        <div className="flex flex-wrap gap-3">
          {pair.map((keep, i) => {
            const remove = pair[1 - i];
            return (
              <ConfirmDialog
                key={keep.id}
                triggerLabel={t("keep", { title: keep.title, format: keep.originalFile.format })}
                triggerClassName={
                  richer === i
                    ? "rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110"
                    : "rounded-md border border-linea bg-superficie px-4 py-2 font-semibold hover:bg-superficie-hundida"
                }
                title={t("keepTitle", { keep: keep.title, remove: remove.title })}
                confirmLabel={t("keepConfirm", { title: remove.title })}
                pendingLabel={t("deleting")}
                action={keepActivityAction}
                fields={{ keepId: keep.id, deleteId: remove.id }}
              >
                <p>{t("keepBody", { remove: remove.title, format: remove.originalFile.format, keep: keep.title })}</p>
                <p className="font-medium text-tinta">{t("irreversible")}</p>
              </ConfirmDialog>
            );
          })}
        </div>
      </section>
    </>
  );
}
