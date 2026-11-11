import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { Eddington, Records } from "@/lib/performance/data";
import { formatDistance, formatDuration, formatElevation, formatSpeed, formatWeekdayDate } from "@/lib/format/units";

type Kind = Records["records"][number]["kind"];

const FORMAT: Record<Kind, (value: number) => string> = {
  longest_distance: formatDistance,
  most_elevation: formatElevation,
  longest_moving_time: formatDuration,
  fastest_average_speed: formatSpeed,
};

/**
 * Número de Eddington y récords (ADR-020). Cada récord enlaza a su rodada y dice de dónde salió el valor; las reglas
 * (mínimos de la velocidad, rodillo, duplicados) se explican en la misma pantalla.
 */
export async function RecordsSection({ records, eddington }: { records: Records | null; eddington: Eddington | null }) {
  const t = await getTranslations("performance.records");
  return (
    <>
      {eddington && (
        <section aria-labelledby="eddington-titulo" className="flex flex-col gap-3">
          <h2 id="eddington-titulo" className="text-2xl font-semibold">
            {t("eddington.title")}
          </h2>
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4 rounded-lg border border-linea bg-superficie p-5">
            <dl className="flex gap-10">
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-tinta-suave">{t("eddington.overall")}</dt>
                <dd className="cifras text-5xl font-bold">{eddington.overall.number}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm font-medium text-tinta-suave">
                  {t("eddington.thisYear", { year: eddington.year })}
                </dt>
                <dd className="cifras text-5xl font-bold">{eddington.thisYear.number}</dd>
              </div>
            </dl>
            <div className="flex max-w-prose flex-col gap-2 text-sm">
              <p className="font-medium">
                {t("eddington.next", {
                  missing: eddington.overall.missingForNext,
                  km: eddington.overall.number + 1,
                })}
              </p>
              <p className="text-tinta-suave">{t("eddington.explain", { number: eddington.overall.number })}</p>
            </div>
          </div>
        </section>
      )}
      {records && (
        <section aria-labelledby="records-titulo" className="flex flex-col gap-3">
          <h2 id="records-titulo" className="text-2xl font-semibold">
            {t("title")}
          </h2>
          {records.records.length === 0 ? (
            <p className="text-tinta-suave">{t("empty")}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {records.records.map((record) => (
                <li key={record.kind} className="flex flex-col gap-1 rounded-lg border border-linea bg-superficie p-4">
                  <p className="text-sm font-medium text-tinta-suave">{t(`kinds.${record.kind}`)}</p>
                  <p className="cifras text-2xl font-bold">{FORMAT[record.kind](record.value)}</p>
                  <Link
                    href={`/actividades/${record.activityId}`}
                    className="font-medium text-acento underline underline-offset-4"
                  >
                    {record.title}
                  </Link>
                  <p className="text-sm text-tinta-suave">
                    {formatWeekdayDate(record.localStartDate)}
                    {record.source && `. ${t(`sources.${record.source}`)}`}
                  </p>
                </li>
              ))}
              {records.biggestDay && (
                <li className="flex flex-col gap-1 rounded-lg border border-linea bg-superficie p-4">
                  <p className="text-sm font-medium text-tinta-suave">{t("biggestDay")}</p>
                  <p className="cifras text-2xl font-bold">{formatDistance(records.biggestDay.distanceMeters)}</p>
                  <p className="text-sm text-tinta-suave">
                    {formatWeekdayDate(records.biggestDay.date)}.{" "}
                    {t("biggestDayRides", { count: records.biggestDay.activityCount })}
                  </p>
                </li>
              )}
            </ul>
          )}
          <p className="max-w-prose text-sm text-tinta-suave">
            {t("rules", {
              km: records.minSpeedDistanceMeters / 1000,
              minutes: records.minSpeedMovingSeconds / 60,
            })}
          </p>
        </section>
      )}
    </>
  );
}
