import { SUB_TYPES, type SubType } from "@/lib/activities/filters";

/**
 * Opciones de Rendimiento en la URL (nombres en español) y su traducción a la consulta de la API. Un valor inválido
 * se ignora en lugar de fallar, como en la lista de actividades.
 */
export const GROUPINGS = ["semana", "mes", "anio"] as const;
export type Grouping = (typeof GROUPINGS)[number];

export type PerformanceOptions = { por: Grouping; tipo?: SubType; bici?: string; rodillo: boolean };

export type TimeseriesQuery = {
  granularity: "week" | "month" | "year";
  includeIndoor: boolean;
  subType?: SubType;
  bikeId?: string;
};

type RawParams = Record<string, string | string[] | undefined>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GRANULARITY: Record<Grouping, TimeseriesQuery["granularity"]> = { semana: "week", mes: "month", anio: "year" };

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value)?.trim() || undefined;

export function parsePerformance(params: RawParams): PerformanceOptions {
  const por = GROUPINGS.find((value) => value === single(params.por)) ?? "semana";
  const tipo = SUB_TYPES.find((value) => value === single(params.tipo));
  const bici = single(params.bici);
  return {
    por,
    tipo,
    bici: bici && UUID.test(bici) ? bici.toLowerCase() : undefined,
    // El rodillo solo cuenta si se pide (ADR-020); elegir tipo "Rodillo" lo incluye por fuerza.
    rodillo: single(params.rodillo) === "1" || tipo === "INDOOR",
  };
}

export function toTimeseriesQuery(options: PerformanceOptions): TimeseriesQuery {
  return {
    granularity: GRANULARITY[options.por],
    includeIndoor: options.rodillo,
    subType: options.tipo,
    bikeId: options.bici,
  };
}

const LOCALE = "es-MX";
const shortDay = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "short", timeZone: "UTC" });
const longDay = new Intl.DateTimeFormat(LOCALE, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const shortMonth = new Intl.DateTimeFormat(LOCALE, { month: "short", timeZone: "UTC" });
const longMonth = new Intl.DateTimeFormat(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });

const utc = (isoDate: string) => new Date(`${isoDate}T00:00:00Z`);
const clean = (text: string) => text.replace(/\./g, "");

/** Etiqueta corta para el eje: "3 nov", "nov" o "2026". */
export function shortLabel(start: string, granularity: TimeseriesQuery["granularity"]): string {
  if (granularity === "year") return start.slice(0, 4);
  if (granularity === "month") return clean(shortMonth.format(utc(start)));
  return clean(shortDay.format(utc(start)));
}

/** Etiqueta completa para la lectura y la tabla: "del 3 al 9 de noviembre de 2026", "noviembre de 2026", "2026". */
export function longLabel(start: string, end: string, granularity: TimeseriesQuery["granularity"]): string {
  if (granularity === "year") return start.slice(0, 4);
  if (granularity === "month") return longMonth.format(utc(start));
  return `${clean(shortDay.format(utc(start)))} – ${longDay.format(utc(end))}`;
}
