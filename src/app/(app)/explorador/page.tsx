import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityFiltersForm } from "@/components/activities/activity-filters";
import { FiltersPanel } from "@/components/activities/filters-panel";
import { ExplorationStats } from "@/components/explorer/exploration-stats";
import { ExplorerMap } from "@/components/explorer/explorer-map";
import { listActivities, listBikes } from "@/lib/activities/data";
import { countFilters, hasFilters, parseFilters, toApiQuery } from "@/lib/activities/filters";
import { basemapAvailable } from "@/lib/basemap/available";
import { getMe } from "@/lib/catalog/data";
import { getExplorationSummary, getLargestSquare } from "@/lib/explorer/data";
import { heatmapQuery } from "@/lib/explorer/heatmap";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("explorador") };
}

export default async function ExplorerPage({ searchParams }: PageProps<"/explorador">) {
  const t = await getTranslations("explorer");
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="max-w-prose text-tinta-suave">{t("intro")}</p>
      </div>
      <Suspense fallback={<div aria-hidden className="h-[32rem] animate-pulse rounded-lg bg-superficie-hundida" />}>
        <Explorer searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Explorer({ searchParams }: { searchParams: PageProps<"/explorador">["searchParams"] }) {
  // Las distancias no aplican al mapa de calor: se ignoran si llegan en la URL.
  const filters = { ...parseFilters(await searchParams), minKm: undefined, maxKm: undefined };
  const [t, ta, bikes, page, me, hasBasemap, summary, square] = await Promise.all([
    getTranslations("explorer"),
    getTranslations("activities"),
    listBikes(),
    listActivities(toApiQuery(filters)),
    getMe(),
    basemapAvailable(),
    getExplorationSummary(),
    getLargestSquare(),
  ]);

  if (!page.ok) {
    return (
      <p role="alert" className="font-medium text-negativo">
        {ta(`errors.${page.error}`)}{" "}
        {page.error === "session" && (
          <Link href="/login?next=%2Fexplorador" className="underline underline-offset-4">
            {ta("errors.login")}
          </Link>
        )}
      </p>
    );
  }

  const filtered = hasFilters(filters);
  if (!filtered && page.data.items.length === 0) {
    return (
      <section aria-labelledby="sin-rodadas" className="flex max-w-2xl flex-col items-start gap-3 py-6">
        <h2 id="sin-rodadas" className="text-2xl font-semibold">
          {t("empty.title")}
        </h2>
        <p className="max-w-prose text-tinta-suave">{t("empty.body")}</p>
        <Link href="/actividades/importar" className="font-semibold text-acento underline underline-offset-4">
          {t("empty.action")}
        </Link>
      </section>
    );
  }

  // El resumen no dice si hay GPS; las de rodillo nunca lo tienen. Si la elegida no tiene, la vista queda en México.
  const focus = page.data.items.find((activity) => activity.subType !== "INDOOR")?.id ?? null;
  const privacy = me?.preferences.trackPrivacyMeters ?? 0;
  const key = JSON.stringify(filters);

  return (
    <>
      <FiltersPanel key={`panel-${key}`} active={countFilters(filters)}>
        <ActivityFiltersForm
          key={`filtros-${key}`}
          filters={filters}
          bikes={bikes.map(({ id, name }) => ({ id, name }))}
          action="/explorador"
          withDistance={false}
        />
      </FiltersPanel>
      {focus === null && (
        <p role="status" className="font-medium">
          {filtered ? t("noMatches") : t("noGps")}
        </p>
      )}
      <ExplorerMap
        query={heatmapQuery(filters)}
        hasBasemap={hasBasemap}
        focusActivityId={focus}
        largestSquare={square?.bbox ? (square.bbox as [number, number, number, number]) : null}
      />
      {summary && <ExplorationStats summary={summary} square={square} />}
      <p className="text-sm text-tinta-suave">
        {privacy > 0 ? t("privacyOn") : t("privacyOff")}{" "}
        <Link href="/configuracion#privacidad" className="font-medium text-acento underline underline-offset-4">
          {t("privacyLink")}
        </Link>
      </p>
    </>
  );
}
