import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityMap } from "@/components/activities/activity-map";
import { MonthlyTrend } from "@/components/home/monthly-trend";
import { getDashboardSummary, type DashboardSummary } from "@/lib/activities/data";
import { api } from "@/lib/auth/session";
import { basemapAvailable } from "@/lib/basemap/available";
import { PERIODS, changeBetween, parsePeriod, type PeriodParam } from "@/lib/dashboard/summary";
import { formatDistance, formatDuration, formatElevation, formatSpeed, formatWeekdayDate } from "@/lib/format/units";

const PERCENT = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 });

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const t = await getTranslations("home");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <header className="flex flex-col gap-1">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <Suspense fallback={<p className="text-tinta-suave">{t("loadingUser")}</p>}>
          <Greeting />
        </Suspense>
      </header>
      <Suspense fallback={<div aria-hidden className="h-96 animate-pulse rounded-lg bg-superficie-hundida" />}>
        <Summary searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Lee la sesión y consulta /me: va detrás de Suspense para no bloquear el resto de la página. */
async function Greeting() {
  const [t, ts] = await Promise.all([getTranslations("home"), getTranslations("session")]);
  const { data } = await (await api()).GET("/me");
  if (!data) {
    return (
      <p role="alert" className="text-negativo">
        {ts("unavailable")}
      </p>
    );
  }
  return <p className="text-lg text-tinta-suave">{t("greeting", { email: data.email })}</p>;
}

async function Summary({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  const period = parsePeriod((await searchParams).periodo);
  const [result, t, hasBasemap] = await Promise.all([
    getDashboardSummary(PERIODS[period]),
    getTranslations("home"),
    basemapAvailable(),
  ]);
  if (!result.ok) {
    return (
      <p role="alert" className="font-medium text-negativo">
        {t("unavailable")}
      </p>
    );
  }
  const summary = result.data;
  if (!summary.latestActivity) {
    return (
      <section aria-labelledby="sin-actividades" className="flex max-w-2xl flex-col items-start gap-3">
        <h2 id="sin-actividades" className="text-2xl font-semibold">
          {t("empty.title")}
        </h2>
        <p className="max-w-prose text-tinta-suave">{t("empty.body")}</p>
        <Link
          href="/actividades/importar"
          className="rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110"
        >
          {t("empty.action")}
        </Link>
      </section>
    );
  }

  return (
    <>
      <PeriodTotals summary={summary} period={period} />
      <MonthlyTrend months={summary.monthlyTrend} />
      <LatestActivity activity={summary.latestActivity} hasBasemap={hasBasemap} />
    </>
  );
}

async function PeriodTotals({ summary, period }: { summary: DashboardSummary; period: PeriodParam }) {
  const t = await getTranslations("home");
  const { current, previous } = summary;
  const empty = current.activityCount === 0 && period !== "todo";

  return (
    <section aria-labelledby="periodo-titulo" className="flex flex-col gap-5">
      <nav
        aria-label={t("periods.label")}
        className="flex self-start rounded-md border border-linea bg-superficie p-0.5"
      >
        {(Object.keys(PERIODS) as PeriodParam[]).map((option) => (
          <Link
            key={option}
            href={option === "mes" ? "/" : `/?periodo=${option}`}
            aria-current={option === period ? "page" : undefined}
            className="rounded px-3 py-1 text-sm font-medium text-tinta-suave aria-[current=page]:bg-superficie-hundida aria-[current=page]:text-tinta"
          >
            {t(`periods.${option}`)}
          </Link>
        ))}
      </nav>
      <div className="flex flex-col gap-2">
        <h2 id="periodo-titulo" className="cifras font-display text-3xl font-semibold tracking-tight lg:text-4xl">
          {empty
            ? t(`noRides.${period as "semana" | "mes" | "año"}`)
            : t.rich(`headline.${period}`, {
                distance: formatDistance(current.distanceMeters),
                count: current.activityCount,
                strong: (chunks) => <strong className="font-bold">{chunks}</strong>,
              })}
        </h2>
        <Delta period={period} current={current.distanceMeters} previous={previous?.distanceMeters} />
      </div>
      <dl className="cifras grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[
          {
            key: "movingTime",
            value: formatDuration(current.movingTimeSeconds),
            current: current.movingTimeSeconds,
            previous: previous?.movingTimeSeconds,
          },
          {
            key: "elevation",
            value: formatElevation(current.elevationGainMeters),
            current: current.elevationGainMeters,
            previous: previous?.elevationGainMeters,
          },
        ].map((total) => (
          <div key={total.key} className="flex flex-col gap-1 rounded-lg border border-linea bg-superficie p-4">
            <dt className="text-sm text-tinta-suave">{t(`totals.${total.key as "movingTime" | "elevation"}`)}</dt>
            <dd className="font-display text-2xl font-semibold">{total.value}</dd>
            <dd>
              <Delta period={period} current={total.current} previous={total.previous} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** Cambio contra el periodo anterior: flecha y texto, nunca solo color. */
async function Delta({ period, current, previous }: { period: PeriodParam; current: number; previous?: number }) {
  if (period === "todo") return null;
  const t = await getTranslations("home");
  const change = changeBetween(current, previous);
  if (change.kind === "none") return null;
  const previousLabel = t(`previous.${period}`);
  const common = { "aria-hidden": true, size: 18, strokeWidth: 2.25, className: "shrink-0" } as const;
  const styles = {
    up: { icon: <TrendingUp {...common} />, color: "text-positivo" },
    down: { icon: <TrendingDown {...common} />, color: "text-negativo" },
    same: { icon: <Minus {...common} />, color: "text-tinta-suave" },
    fromZero: { icon: <TrendingUp {...common} />, color: "text-tinta-suave" },
  }[change.kind];
  const text =
    change.kind === "up" || change.kind === "down"
      ? t(`change.${change.kind}`, { percent: PERCENT.format(change.percent), previous: previousLabel })
      : t(`change.${change.kind}`, { previous: previousLabel });
  return (
    <p className={`flex items-center gap-1.5 text-sm font-medium ${styles.color}`}>
      {styles.icon}
      {text}
    </p>
  );
}

async function LatestActivity({
  activity,
  hasBasemap,
}: {
  activity: NonNullable<DashboardSummary["latestActivity"]>;
  hasBasemap: boolean;
}) {
  const [t, ta] = await Promise.all([getTranslations("home.latest"), getTranslations("activities")]);
  const hasMap = activity.subType !== "INDOOR" && activity.distanceMeters !== null;
  return (
    <section aria-labelledby="reciente-titulo" className="flex flex-col gap-3">
      <h2 id="reciente-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      <article className="grid overflow-hidden rounded-lg border border-linea bg-superficie md:grid-cols-2">
        {hasMap && (
          <div className="p-3 pb-0 md:pb-3">
            <ActivityMap
              activityId={activity.id}
              hasBasemap={hasBasemap}
              mini
              label={t("mapLabel", { title: activity.title })}
            />
          </div>
        )}
        <div className="flex flex-col gap-3 p-5">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm text-tinta-suave">
              {formatWeekdayDate(activity.localStartDate)}, {ta(`types.${activity.subType}`)}
            </p>
            <h3 className="font-display text-2xl font-semibold">{activity.title}</h3>
          </div>
          <p className="cifras flex flex-wrap gap-x-5 gap-y-1 text-lg">
            <span className="font-semibold">{formatDistance(activity.distanceMeters)}</span>
            <span>{formatDuration(activity.movingTimeSeconds)}</span>
            <span>{formatElevation(activity.elevationGainMeters)}</span>
            <span>{formatSpeed(activity.averageSpeedMps)}</span>
          </p>
          <Link
            href={`/actividades/${activity.id}`}
            className="mt-auto self-start font-semibold text-acento underline underline-offset-4"
          >
            {t("view")}
          </Link>
        </div>
      </article>
    </section>
  );
}
