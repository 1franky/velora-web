"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition } from "react";
import { loadMoreActivities } from "@/app/(app)/actividades/actions";
import type { ActivitySummary, LoadError } from "@/lib/activities/data";
import type { ActivityQuery } from "@/lib/activities/filters";
import { formatDistance, formatDuration, formatElevation, formatSpeed, formatWeekdayDate } from "@/lib/format/units";

type Props = { initialItems: ActivitySummary[]; initialCursor: string | null; query: ActivityQuery };

/**
 * Lista de actividades: tabla en pantallas medianas y grandes, tarjetas en móvil. "Mostrar más" pide la siguiente
 * página con el cursor opaco de la API y la agrega al final.
 */
export function ActivityList({ initialItems, initialCursor, query }: Props) {
  const t = useTranslations("activities");
  // Las páginas agregadas se descartan cuando el servidor manda una primera página nueva (p. ej. tras importar).
  const [loaded, setLoaded] = useState({ base: initialItems, extra: [] as ActivitySummary[], cursor: initialCursor });
  if (loaded.base !== initialItems) {
    setLoaded({ base: initialItems, extra: [], cursor: initialCursor });
  }
  const items = loaded.base === initialItems ? [...initialItems, ...loaded.extra] : initialItems;
  const cursor = loaded.base === initialItems ? loaded.cursor : initialCursor;
  const [error, setError] = useState<LoadError | null>(null);
  const [pending, startTransition] = useTransition();

  function showMore() {
    if (!cursor) return;
    setError(null);
    startTransition(async () => {
      const result = await loadMoreActivities(query, cursor);
      if (result.ok) {
        setLoaded((current) => ({
          base: current.base,
          extra: [...current.extra, ...result.data.items],
          cursor: result.data.nextCursor,
        }));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <table className="hidden w-full border-collapse overflow-hidden rounded-lg bg-superficie text-left md:table">
        <caption className="sr-only">{t("listLabel")}</caption>
        <thead className="border-b border-linea text-sm text-tinta-suave">
          <tr>
            <th scope="col" className="px-4 py-3 font-medium">
              {t("columns.date")}
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              {t("columns.title")}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {t("columns.distance")}
            </th>
            <th scope="col" className="px-4 py-3 text-right font-medium">
              {t("columns.movingTime")}
            </th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">
              {t("columns.elevation")}
            </th>
            <th scope="col" className="hidden px-4 py-3 text-right font-medium lg:table-cell">
              {t("columns.speed")}
            </th>
          </tr>
        </thead>
        <tbody className="cifras">
          {items.map((activity) => (
            <tr key={activity.id} className="border-b border-linea last:border-0 hover:bg-superficie-hundida">
              <td className="px-4 py-3 whitespace-nowrap text-tinta-suave">
                {formatWeekdayDate(activity.localStartDate)}
              </td>
              <td className="px-4 py-3">
                <Link href={`/actividades/${activity.id}`} className="font-semibold hover:underline">
                  {activity.title}
                </Link>
                <span className="ml-2 rounded bg-superficie-hundida px-1.5 py-0.5 text-sm text-tinta-suave">
                  {t(`types.${activity.subType}`)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-semibold whitespace-nowrap">
                {formatDistance(activity.distanceMeters)}
              </td>
              <td className="px-4 py-3 text-right whitespace-nowrap">{formatDuration(activity.movingTimeSeconds)}</td>
              <td className="hidden px-4 py-3 text-right whitespace-nowrap lg:table-cell">
                {formatElevation(activity.elevationGainMeters)}
              </td>
              <td className="hidden px-4 py-3 text-right whitespace-nowrap lg:table-cell">
                {formatSpeed(activity.averageSpeedMps)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ol aria-label={t("listLabel")} className="flex flex-col gap-2 md:hidden">
        {items.map((activity) => (
          <li key={activity.id}>
            <Link
              href={`/actividades/${activity.id}`}
              className="flex flex-col gap-2 rounded-lg border border-linea bg-superficie p-4"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{activity.title}</span>
                <span className="shrink-0 text-sm text-tinta-suave">{t(`types.${activity.subType}`)}</span>
              </span>
              <span className="text-sm text-tinta-suave">{formatWeekdayDate(activity.localStartDate)}</span>
              <span className="cifras flex gap-5">
                <span className="font-semibold">{formatDistance(activity.distanceMeters)}</span>
                <span>{formatDuration(activity.movingTimeSeconds)}</span>
                <span>{formatElevation(activity.elevationGainMeters)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap items-center gap-4">
        {cursor && (
          <button
            type="button"
            onClick={showMore}
            disabled={pending}
            className="rounded-md border border-linea bg-superficie px-4 py-2 font-semibold hover:bg-superficie-hundida disabled:opacity-60"
          >
            {pending ? t("loadingMore") : t("showMore")}
          </button>
        )}
        <p role="status" className="text-sm text-tinta-suave">
          {t("count", { count: items.length })}
        </p>
      </div>
      {error && (
        <p role="alert" className="font-medium text-negativo">
          {t(`errors.${error}`)}
        </p>
      )}
    </div>
  );
}
