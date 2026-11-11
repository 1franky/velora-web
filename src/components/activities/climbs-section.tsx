import { getTranslations } from "next-intl/server";
import type { ActivityClimbs } from "@/lib/activities/data";
import { formatDistance, formatElevation } from "@/lib/format/units";

const PERCENT = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const SHARE = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 });
/** Nombre de cada rango de pendiente, en el orden de la API (de la bajada fuerte a la subida fuerte). */
const BIN_KEYS = ["steepDown", "down", "gentleDown", "flat", "gentleUp", "up", "steepUp"] as const;

/**
 * Subidas detectadas y distribución de pendientes (climbs/1, ADR-020). Las barras llevan su valor escrito: la
 * forma ayuda a comparar, pero la información no depende del color ni del largo.
 */
export async function ClimbsSection({ data }: { data: ActivityClimbs }) {
  const t = await getTranslations("climbs");
  const total = data.gradeDistribution.reduce((sum, bin) => sum + bin.distanceMeters, 0);
  return (
    <section aria-labelledby="subidas-titulo" className="flex flex-col gap-4">
      <h2 id="subidas-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      {data.climbs.length === 0 ? (
        <p className="text-tinta-suave">{t("none")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
          <table className="cifras w-full border-collapse text-left">
            <caption className="sr-only">{t("caption")}</caption>
            <thead className="border-b border-linea text-sm text-tinta-suave">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">
                  {t("from")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {t("length")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {t("gain")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {t("average")}
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  {t("max")}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.climbs.map((climb) => (
                <tr key={climb.startDistanceMeters} className="border-b border-linea last:border-0">
                  <th scope="row" className="px-4 py-2 font-medium">
                    {t("range", {
                      from: formatDistance(climb.startDistanceMeters),
                      to: formatDistance(climb.endDistanceMeters),
                    })}
                  </th>
                  <td className="px-4 py-2 text-right">{formatDistance(climb.lengthMeters)}</td>
                  <td className="px-4 py-2 text-right">{formatElevation(climb.elevationGainMeters)}</td>
                  <td className="px-4 py-2 text-right">{PERCENT.format(climb.averageGradePercent)} %</td>
                  <td className="px-4 py-2 text-right">{PERCENT.format(climb.maxGradePercent)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {total > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold">{t("grades")}</h3>
          <ul className="flex flex-col gap-1.5">
            {data.gradeDistribution.map((bin, i) => (
              <li key={BIN_KEYS[i]} className="grid grid-cols-[minmax(9rem,14rem)_1fr_auto] items-center gap-3 text-sm">
                <span>{t(`bins.${BIN_KEYS[i]}`)}</span>
                <span aria-hidden className="h-3 rounded-full bg-superficie-hundida">
                  <span
                    className="block h-3 rounded-full bg-acento-medio"
                    style={{ width: `${(100 * bin.distanceMeters) / total}%` }}
                  />
                </span>
                <span className="cifras w-28 text-right text-tinta-suave">
                  {formatDistance(bin.distanceMeters)}, {SHARE.format(bin.distanceMeters / total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="max-w-prose text-sm text-tinta-suave">{t("rule")}</p>
    </section>
  );
}
