import { Upload } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { ActivityFiltersForm } from "@/components/activities/activity-filters";
import { ActivityList } from "@/components/activities/activity-list";
import { FiltersPanel } from "@/components/activities/filters-panel";
import { listActivities, listBikes } from "@/lib/activities/data";
import { countFilters, hasFilters, parseFilters, toApiQuery } from "@/lib/activities/filters";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("activities"))("title") };
}

export default async function ActivitiesPage({ searchParams }: PageProps<"/actividades">) {
  const t = await getTranslations("activities");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <Link
          href="/actividades/importar"
          className="inline-flex items-center gap-2 rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110"
        >
          <Upload aria-hidden size={18} strokeWidth={2} />
          {t("import")}
        </Link>
      </div>
      <Suspense fallback={<ListSkeleton />}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/actividades">["searchParams"] }) {
  const filters = parseFilters(await searchParams);
  const query = toApiQuery(filters);
  const [t, bikes, page] = await Promise.all([getTranslations("activities"), listBikes(), listActivities(query)]);
  const filtered = hasFilters(filters);
  // La clave reinicia el formulario y la lista cuando cambian los filtros en la URL.
  const key = JSON.stringify(filters);

  if (!page.ok) {
    return (
      <p role="alert" className="font-medium text-negativo">
        {t(`errors.${page.error}`)}{" "}
        {page.error === "session" && (
          <Link href="/login?next=%2Factividades" className="underline underline-offset-4">
            {t("errors.login")}
          </Link>
        )}
      </p>
    );
  }

  if (!filtered && page.data.items.length === 0) {
    return (
      <section aria-labelledby="sin-actividades" className="flex max-w-2xl flex-col items-start gap-3 py-6">
        <h2 id="sin-actividades" className="text-2xl font-semibold">
          {t("empty.title")}
        </h2>
        <p className="max-w-prose text-tinta-suave">{t("empty.body")}</p>
        <Link href="/actividades/importar" className="font-semibold text-acento underline underline-offset-4">
          {t("empty.action")}
        </Link>
      </section>
    );
  }

  return (
    <>
      <FiltersPanel key={`panel-${key}`} active={countFilters(filters)}>
        <ActivityFiltersForm
          key={`filtros-${key}`}
          filters={filters}
          bikes={bikes.map(({ id, name }) => ({ id, name }))}
        />
      </FiltersPanel>
      {page.data.items.length === 0 ? (
        <section aria-labelledby="sin-coincidencias" className="flex flex-col gap-2 py-4">
          <h2 id="sin-coincidencias" className="text-2xl font-semibold">
            {t("noMatches.title")}
          </h2>
          <p className="text-tinta-suave">{t("noMatches.body")}</p>
        </section>
      ) : (
        <ActivityList
          key={`lista-${key}`}
          initialItems={page.data.items}
          initialCursor={page.data.nextCursor}
          query={query}
        />
      )}
    </>
  );
}

function ListSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      <div className="h-36 animate-pulse rounded-lg bg-superficie-hundida motion-reduce:animate-none" />
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-superficie motion-reduce:animate-none" />
      ))}
    </div>
  );
}
