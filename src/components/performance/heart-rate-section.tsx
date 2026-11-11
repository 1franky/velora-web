import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { HeartRateZones } from "@/lib/performance/data";
import { formatDuration } from "@/lib/format/units";

const SHARE = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 });

/**
 * Tiempo en zonas cardiacas (hr-zones/1, ADR-020) del mismo periodo que las tendencias. Las zonas son ordinales: una
 * sola tinta, con el tiempo y el porcentaje escritos. Indicador de entrenamiento, no diagnóstico.
 */
export async function HeartRateSection({ data }: { data: HeartRateZones }) {
  const t = await getTranslations("performance.heartRate");
  const zoned = data.zones.reduce((sum, zone) => sum + zone.seconds, 0) + data.belowZonesSeconds;
  return (
    <section aria-labelledby="zonas-titulo" className="flex flex-col gap-3">
      <h2 id="zonas-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      {data.maxHeartRateBpm == null ? (
        <p className="max-w-prose">
          {t("noMaximum")}{" "}
          <Link
            href="/configuracion#frecuencia-cardiaca"
            className="font-semibold text-acento underline underline-offset-4"
          >
            {t("setMaximum")}
          </Link>
        </p>
      ) : zoned === 0 ? (
        <p className="text-tinta-suave">{t("noData")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {[...data.zones].reverse().map((zone) => (
            <li key={zone.zone} className="grid grid-cols-[minmax(9rem,13rem)_1fr_auto] items-center gap-3 text-sm">
              <span>
                <span className="font-semibold">{t("zone", { zone: zone.zone })}</span>{" "}
                <span className="cifras text-tinta-suave">
                  {zone.toBpm == null
                    ? t("fromBpm", { from: zone.fromBpm })
                    : t("rangeBpm", { from: zone.fromBpm, to: zone.toBpm })}
                </span>
              </span>
              <span aria-hidden className="h-3 rounded-full bg-superficie-hundida">
                <span
                  className="block h-3 rounded-full bg-acento-medio"
                  style={{ width: `${(100 * zone.seconds) / zoned}%` }}
                />
              </span>
              <span className="cifras w-32 text-right text-tinta-suave">
                {formatDuration(zone.seconds)}, {SHARE.format(zone.seconds / zoned)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.maxHeartRateBpm != null && (
        <p className="max-w-prose text-sm text-tinta-suave">
          {t("explain", { max: data.maxHeartRateBpm, below: formatDuration(data.belowZonesSeconds) })}{" "}
          {data.activitiesWithoutHeartRate > 0 && t("withoutHr", { count: data.activitiesWithoutHeartRate })}{" "}
          {t("notMedical")}
        </p>
      )}
    </section>
  );
}
