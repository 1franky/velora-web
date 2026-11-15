import { getTranslations } from "next-intl/server";
import { connectStravaAction, disconnectStravaAction } from "@/app/(app)/configuracion/strava-actions";
import { getMe } from "@/lib/catalog/data";
import { formatInstantDate, formatInstantTime } from "@/lib/format/units";
import { isStravaNotice, isSuccessNotice } from "@/lib/strava/connection";
import { getStravaStatus } from "@/lib/strava/data";

const BUTTON = "rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110";

/**
 * Conector de Strava (ADR-030). No se muestra si el servidor lo tiene apagado. Se lee detrás de Suspense porque
 * depende de la solicitud.
 */
export async function StravaSection({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [status, me, params] = await Promise.all([getStravaStatus(), getMe(), searchParams]);
  if (!status?.enabled) return null;
  const t = await getTranslations("settings.strava");
  const timeZone = me?.preferences.timeZone ?? "America/Mexico_City";
  const notice = isStravaNotice(params.strava) ? params.strava : null;
  const when = (instant: string) =>
    t("when", { date: formatInstantDate(instant, timeZone), time: formatInstantTime(instant, timeZone) });

  return (
    <section aria-labelledby="strava" className="flex flex-col gap-4">
      <div className="flex max-w-2xl flex-col gap-1">
        <h2 id="strava" className="text-2xl font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm text-tinta-suave">{t("hint")}</p>
      </div>
      <div className="flex max-w-2xl flex-col gap-4">
        {notice &&
          (isSuccessNotice(notice) ? (
            <p role="status" className="rounded-md border border-borde p-3 text-sm font-medium">
              {t(`notices.${notice}`)}
            </p>
          ) : (
            <p role="alert" className="rounded-md border border-negativo p-3 text-sm font-medium text-negativo">
              {t(`notices.${notice}`)}
            </p>
          ))}

        {status.connected ? (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-tinta-suave">{t("connectedSince")}</dt>
              <dd>{status.connectedAt ? when(status.connectedAt) : "—"}</dd>
              <dt className="text-tinta-suave">{t("imported")}</dt>
              <dd>{t("importedCount", { count: status.importedActivities })}</dd>
              <dt className="text-tinta-suave">{t("history")}</dt>
              <dd>{status.backfillDone ? t("historyDone") : t("historyRunning")}</dd>
              <dt className="text-tinta-suave">{t("lastSync")}</dt>
              <dd>{status.lastSyncAt ? when(status.lastSyncAt) : t("lastSyncNever")}</dd>
            </dl>
            {status.lastSyncError && (
              <p role="alert" className="rounded-md border border-negativo p-3 text-sm font-medium text-negativo">
                {t(`syncErrors.${status.lastSyncError}`)}
              </p>
            )}
            {status.lastSyncError === "AUTH_REVOKED" && (
              <form action={connectStravaAction}>
                <button type="submit" className={BUTTON}>
                  {t("reconnect")}
                </button>
              </form>
            )}
            <form action={disconnectStravaAction} className="flex flex-col gap-3 rounded-lg border border-borde p-4">
              <h3 className="text-lg font-semibold">{t("disconnect.title")}</h3>
              <p className="text-sm">{t("disconnect.body")}</p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" name="borrar" value="si" className="mt-1" />
                <span>{t("disconnect.delete", { count: status.importedActivities })}</span>
              </label>
              <div>
                <button
                  type="submit"
                  className="rounded-md border border-negativo px-4 py-2 font-semibold text-negativo hover:bg-superficie-hundida"
                >
                  {t("disconnect.submit")}
                </button>
              </div>
            </form>
          </>
        ) : (
          <form action={connectStravaAction} className="flex flex-col gap-3">
            <p className="text-sm">{t("body")}</p>
            <p className="text-sm text-tinta-suave">{t("terms")}</p>
            <div>
              <button type="submit" className={BUTTON}>
                {t("connect")}
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
