import { getTranslations } from "next-intl/server";
import type { ActivityLap } from "@/lib/activities/data";
import { MISSING, formatDistance, formatDuration, formatSpeed } from "@/lib/format/units";

type Column = { key: string; label: string; value: (lap: ActivityLap) => string; numeric: boolean };

/** Vueltas del dispositivo. Las columnas sin ningún dato se omiten en lugar de llenarse de guiones. */
export async function LapsTable({ laps }: { laps: ActivityLap[] }) {
  const t = await getTranslations("laps");
  const integer = (value: number | null, unit: string) => (value == null ? MISSING : `${value} ${unit}`);
  const all: Column[] = [
    { key: "distance", label: t("distance"), value: (lap) => formatDistance(lap.distanceMeters), numeric: true },
    {
      key: "time",
      label: t("time"),
      value: (lap) => formatDuration(lap.timerTimeSeconds ?? lap.elapsedTimeSeconds),
      numeric: true,
    },
    { key: "speed", label: t("speed"), value: (lap) => formatSpeed(lap.averageSpeedMps), numeric: true },
    { key: "heartRate", label: t("heartRate"), value: (lap) => integer(lap.averageHeartRateBpm, "ppm"), numeric: true },
    { key: "power", label: t("power"), value: (lap) => integer(lap.averagePowerWatts, "W"), numeric: true },
    { key: "cadence", label: t("cadence"), value: (lap) => integer(lap.averageCadenceRpm, "rpm"), numeric: true },
  ];
  const columns = all.filter((column) => laps.some((lap) => column.value(lap) !== MISSING));

  return (
    <section aria-labelledby="vueltas-titulo" className="flex flex-col gap-3">
      <h2 id="vueltas-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-linea bg-superficie">
        <table className="cifras w-full border-collapse text-left">
          <caption className="sr-only">{t("caption")}</caption>
          <thead className="border-b border-linea text-sm text-tinta-suave">
            <tr>
              <th scope="col" className="px-4 py-2.5 font-medium">
                {t("lap")}
              </th>
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-4 py-2.5 text-right font-medium whitespace-nowrap">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {laps.map((lap) => (
              <tr key={lap.lapNumber} className="border-b border-linea last:border-0">
                <th scope="row" className="px-4 py-2.5 font-semibold">
                  {lap.lapNumber}
                </th>
                {columns.map((column) => (
                  <td key={column.key} className="px-4 py-2.5 text-right whitespace-nowrap">
                    {column.value(lap)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
