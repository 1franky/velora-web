import { useTranslations } from "next-intl";
import Link from "next/link";
import { SUB_TYPES, hasFilters, type ActivityFilters } from "@/lib/activities/filters";

type BikeOption = { id: string; name: string };

const field = "rounded-md border border-linea bg-superficie px-3 py-2 text-base";

type Props = {
  filters: ActivityFilters;
  bikes: BikeOption[];
  /** Página que recibe los filtros (la lista o el Explorador). */
  action?: string;
  /** Distancia mínima y máxima; el mapa de calor no las usa. */
  withDistance?: boolean;
};

/**
 * Formulario GET: los filtros quedan en la URL y funciona sin JavaScript. `key` en la página lo reinicia al cambiar
 * la URL para que los campos reflejen los filtros aplicados.
 */
export function ActivityFiltersForm({ filters, bikes, action = "/actividades", withDistance = true }: Props) {
  const t = useTranslations("activities");
  const shown = withDistance ? filters : { ...filters, minKm: undefined, maxKm: undefined };
  return (
    <form
      method="get"
      action={action}
      aria-label={t("filters.title")}
      className={`grid grid-cols-2 gap-x-3 gap-y-3 rounded-lg border border-linea bg-superficie p-4 md:grid-cols-3 ${
        withDistance ? "xl:grid-cols-6" : "xl:grid-cols-4"
      }`}
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("filters.from")}
        <input type="date" name="desde" defaultValue={filters.desde} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("filters.to")}
        <input type="date" name="hasta" defaultValue={filters.hasta} className={field} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("filters.type")}
        <select name="tipo" defaultValue={filters.tipo ?? ""} className={field}>
          <option value="">{t("filters.anyType")}</option>
          {SUB_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {t("filters.bike")}
        <select name="bici" defaultValue={filters.bici ?? ""} className={field} disabled={bikes.length === 0}>
          <option value="">{t("filters.anyBike")}</option>
          {bikes.map((bike) => (
            <option key={bike.id} value={bike.id}>
              {bike.name}
            </option>
          ))}
        </select>
      </label>
      {withDistance && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("filters.minKm")}
            <input
              type="number"
              name="minKm"
              min={0}
              step="any"
              inputMode="decimal"
              defaultValue={filters.minKm}
              className={`${field} cifras`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            {t("filters.maxKm")}
            <input
              type="number"
              name="maxKm"
              min={0}
              step="any"
              inputMode="decimal"
              defaultValue={filters.maxKm}
              className={`${field} cifras`}
            />
          </label>
        </>
      )}
      <div className="col-span-full flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110"
        >
          {t("filters.apply")}
        </button>
        {hasFilters(shown) && (
          <Link href={action} className="font-medium text-acento underline underline-offset-4">
            {t("filters.clear")}
          </Link>
        )}
      </div>
    </form>
  );
}
