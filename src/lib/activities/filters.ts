/**
 * Filtros de la lista de actividades. Viven en la URL (se pueden compartir y el botón Atrás funciona) con nombres en
 * español; aquí se validan y se traducen a la consulta de la API. Un valor inválido se ignora en vez de fallar.
 */
export const SUB_TYPES = ["MOUNTAIN_BIKE", "ROAD", "GRAVEL", "INDOOR", "OTHER"] as const;
export type SubType = (typeof SUB_TYPES)[number];

/** Valores tal como se muestran en el formulario (km, no metros). */
export type ActivityFilters = {
  desde?: string;
  hasta?: string;
  tipo?: SubType;
  bici?: string;
  minKm?: number;
  maxKm?: number;
};

/** Consulta de GET /activities (sin cursor ni límite). */
export type ActivityQuery = {
  from?: string;
  to?: string;
  subType?: SubType;
  bikeId?: string;
  minDistanceM?: number;
  maxDistanceM?: number;
};

type RawParams = Record<string, string | string[] | undefined>;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Más que la vuelta al mundo: protege contra números absurdos en la URL. */
const MAX_KM = 100_000;

function single(value: string | string[] | undefined): string | undefined {
  const first = Array.isArray(value) ? value[0] : value;
  const trimmed = first?.trim();
  return trimmed ? trimmed : undefined;
}

function validDate(value: string | undefined): string | undefined {
  if (!value || !ISO_DATE.test(value)) {
    return undefined;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? value : undefined;
}

function kilometers(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= MAX_KM ? parsed : undefined;
}

export function parseFilters(params: RawParams): ActivityFilters {
  const tipo = single(params.tipo);
  const bici = single(params.bici);
  const filters: ActivityFilters = {
    desde: validDate(single(params.desde)),
    hasta: validDate(single(params.hasta)),
    tipo: SUB_TYPES.find((value) => value === tipo),
    bici: bici && UUID.test(bici) ? bici.toLowerCase() : undefined,
    minKm: kilometers(single(params.minKm)),
    maxKm: kilometers(single(params.maxKm)),
  };
  // Rangos invertidos: se intercambian en lugar de devolver una lista vacía sin explicación.
  if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
    [filters.desde, filters.hasta] = [filters.hasta, filters.desde];
  }
  if (filters.minKm !== undefined && filters.maxKm !== undefined && filters.minKm > filters.maxKm) {
    [filters.minKm, filters.maxKm] = [filters.maxKm, filters.minKm];
  }
  return filters;
}

export function hasFilters(filters: ActivityFilters): boolean {
  return countFilters(filters) > 0;
}

export function countFilters(filters: ActivityFilters): number {
  return Object.values(filters).filter((value) => value !== undefined).length;
}

export function toApiQuery(filters: ActivityFilters): ActivityQuery {
  return {
    from: filters.desde,
    to: filters.hasta,
    subType: filters.tipo,
    bikeId: filters.bici,
    minDistanceM: filters.minKm === undefined ? undefined : Math.round(filters.minKm * 1000),
    maxDistanceM: filters.maxKm === undefined ? undefined : Math.round(filters.maxKm * 1000),
  };
}

/** Valida una consulta que llega del navegador (server action de "Mostrar más"): mismas reglas que la URL. */
export function sanitizeQuery(query: ActivityQuery): ActivityQuery {
  const filters = parseFilters({
    desde: query.from,
    hasta: query.to,
    tipo: query.subType,
    bici: query.bikeId,
    minKm: query.minDistanceM === undefined ? undefined : String(query.minDistanceM / 1000),
    maxKm: query.maxDistanceM === undefined ? undefined : String(query.maxDistanceM / 1000),
  });
  return toApiQuery(filters);
}
