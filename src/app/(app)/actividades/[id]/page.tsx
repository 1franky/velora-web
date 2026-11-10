import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityActions } from "@/components/activities/activity-actions";
import { ActivityCharts } from "@/components/activities/activity-charts";
import { DuplicatesNotice } from "@/components/activities/duplicates-notice";
import { EditActivityDialog } from "@/components/settings/dialogs";
import { listAllBikes } from "@/lib/catalog/data";
import { ActivityMap } from "@/components/activities/activity-map";
import { LapsTable } from "@/components/activities/laps-table";
import { getActivity, getLaps, getStreams, type ActivityDetail } from "@/lib/activities/data";
import { prepareSeries } from "@/lib/activities/series";
import { basemapAvailable } from "@/lib/basemap/available";
import {
  MISSING,
  formatDistance,
  formatDuration,
  formatElevation,
  formatFileSize,
  formatInstantDate,
  formatSpeed,
  formatWeekdayDate,
} from "@/lib/format/units";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/actividades/[id]">): Promise<Metadata> {
  const { id } = await params;
  const result = UUID.test(id) ? await getActivity(id) : null;
  return { title: result?.ok ? result.data.title : (await getTranslations("activities"))("title") };
}

export default async function ActivityPage({ params, searchParams }: PageProps<"/actividades/[id]">) {
  const t = await getTranslations("activities.detail");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
      <Link
        href="/actividades"
        className="inline-flex items-center gap-1.5 self-start font-medium text-tinta-suave hover:text-tinta"
      >
        <ArrowLeft aria-hidden size={18} strokeWidth={2} />
        {t("back")}
      </Link>
      <Suspense fallback={<div aria-hidden className="h-64 animate-pulse rounded-lg bg-superficie-hundida" />}>
        <Detail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type DetailProps = Pick<PageProps<"/actividades/[id]">, "params" | "searchParams">;

async function Detail({ params, searchParams }: DetailProps) {
  const [{ id }, { aviso }] = await Promise.all([params, searchParams]);
  if (!UUID.test(id)) notFound();
  const [result, t, tn, hasBasemap, bikes] = await Promise.all([
    getActivity(id),
    getTranslations("activities"),
    getTranslations("notices"),
    basemapAvailable(),
    listAllBikes(),
  ]);
  if (!result.ok) {
    if (result.error === "notFound") notFound();
    return (
      <p role="alert" className="font-medium text-negativo">
        {t(`errors.${result.error}`)}
      </p>
    );
  }
  const activity = result.data;
  const bikeName = bikes?.find((bike) => bike.id === activity.bikeId)?.name;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-tinta-suave">
            {formatWeekdayDate(activity.localStartDate)}, {t(`types.${activity.subType}`)}
            {bikeName && `, ${bikeName}`}
          </p>
          <h1 className="text-4xl font-bold tracking-tight">{activity.title}</h1>
        </div>
        <EditActivityDialog
          activity={{ id: activity.id, title: activity.title, subType: activity.subType, bikeId: activity.bikeId }}
          bikes={(bikes ?? []).map(({ id, name, active }) => ({ id, name, active }))}
        />
      </header>
      {aviso === "duplicado-resuelto" && (
        <p role="status" className="rounded-lg border border-positivo bg-superficie px-4 py-3 font-medium">
          {tn("duplicateResolved")}
        </p>
      )}
      <Suspense>
        <DuplicatesNotice activityId={activity.id} />
      </Suspense>
      {activity.hasTrack && <ActivityMap activityId={activity.id} hasBasemap={hasBasemap} />}
      <Metrics activity={activity} />
      {activity.streamTypes.length > 0 && (
        <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-lg bg-superficie-hundida" />}>
          <Charts id={activity.id} />
        </Suspense>
      )}
      {activity.lapCount > 1 && (
        <Suspense>
          <Laps id={activity.id} />
        </Suspense>
      )}
      <p className="text-sm text-tinta-suave">
        {t("detail.source", {
          format: activity.originalFile.format,
          size: formatFileSize(activity.originalFile.sizeBytes),
          date: formatInstantDate(activity.originalFile.importedAt, activity.timeZone),
        })}
      </p>
      <ActivityActions activityId={activity.id} title={activity.title} />
    </>
  );
}

async function Metrics({ activity }: { activity: ActivityDetail }) {
  const t = await getTranslations("activities.detail");
  const unit = (key: "bpm" | "watts" | "rpm", value: number | null) => (value == null ? MISSING : t(key, { value }));
  // Las cuatro primeras van destacadas: son las que se comparan de una rodada a otra.
  const primary = [
    { field: "distanceMeters", label: t("distance"), value: formatDistance(activity.distanceMeters) },
    { field: "movingTimeSeconds", label: t("movingTime"), value: formatDuration(activity.movingTimeSeconds) },
    { field: "elevationGainMeters", label: t("elevationGain"), value: formatElevation(activity.elevationGainMeters) },
    { field: "averageSpeedMps", label: t("averageSpeed"), value: formatSpeed(activity.averageSpeedMps) },
  ];
  const secondary = [
    { field: "elapsedTimeSeconds", label: t("elapsedTime"), value: formatDuration(activity.elapsedTimeSeconds) },
    { field: "elevationLossMeters", label: t("elevationLoss"), value: formatElevation(activity.elevationLossMeters) },
    { field: "maxSpeedMps", label: t("maxSpeed"), value: formatSpeed(activity.maxSpeedMps) },
    { field: "averageHeartRateBpm", label: t("averageHeartRate"), value: unit("bpm", activity.averageHeartRateBpm) },
    { field: "maxHeartRateBpm", label: t("maxHeartRate"), value: unit("bpm", activity.maxHeartRateBpm) },
    { field: "averagePowerWatts", label: t("averagePower"), value: unit("watts", activity.averagePowerWatts) },
    { field: "maxPowerWatts", label: t("maxPower"), value: unit("watts", activity.maxPowerWatts) },
    { field: "averageCadenceRpm", label: t("averageCadence"), value: unit("rpm", activity.averageCadenceRpm) },
  ].filter((metric) => metric.value !== MISSING);
  const derived = (field: string) => activity.metricsProvenance[field] === "DERIVED";

  return (
    <section aria-labelledby="metricas" className="flex flex-col gap-4">
      <h2 id="metricas" className="sr-only">
        {t("metrics")}
      </h2>
      <dl className="cifras grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-linea bg-linea lg:grid-cols-4">
        {primary.map((metric) => (
          <div key={metric.field} className="flex flex-col gap-1 bg-superficie p-4">
            <dt className="text-sm text-tinta-suave">{metric.label}</dt>
            <dd className="font-display text-3xl font-semibold">{metric.value}</dd>
            {derived(metric.field) && <dd className="text-xs text-tinta-suave">{t("derived")}</dd>}
          </div>
        ))}
      </dl>
      {secondary.length > 0 && (
        <dl className="cifras grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
          {secondary.map((metric) => (
            <div key={metric.field} className="flex flex-col">
              <dt className="text-sm text-tinta-suave">{metric.label}</dt>
              <dd className="text-lg font-medium">{metric.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

/** Series reducidas en el servidor (~1 200 puntos): el navegador no recibe las ~14 000 muestras por serie. */
async function Charts({ id }: { id: string }) {
  const [result, t] = await Promise.all([getStreams(id), getTranslations("charts")]);
  if (!result.ok) {
    return <p className="text-tinta-suave">{t("unavailable")}</p>;
  }
  const prepared = prepareSeries(result.data.streams, result.data.sampleCount);
  return prepared.series.length > 0 && (prepared.distanceKm || prepared.elapsedSeconds) ? (
    <ActivityCharts data={prepared} />
  ) : null;
}

async function Laps({ id }: { id: string }) {
  const result = await getLaps(id);
  return result.ok && result.data.length > 1 ? <LapsTable laps={result.data} /> : null;
}
