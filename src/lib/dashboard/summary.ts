/** Periodos del resumen de Inicio. En la URL van en español (`?periodo=mes`); la API usa los nombres en inglés. */
export const PERIODS = { semana: "week", mes: "month", año: "year", todo: "all" } as const;
export type PeriodParam = keyof typeof PERIODS;
export type Period = (typeof PERIODS)[PeriodParam];

export const DEFAULT_PERIOD: PeriodParam = "mes";

export function parsePeriod(value: string | string[] | undefined): PeriodParam {
  const first = Array.isArray(value) ? value[0] : value;
  return first !== undefined && Object.hasOwn(PERIODS, first) ? (first as PeriodParam) : DEFAULT_PERIOD;
}

export type Change =
  | { kind: "up" | "down"; percent: number }
  | { kind: "same" }
  /** El periodo anterior no tuvo nada: un porcentaje sería infinito o engañoso. */
  | { kind: "fromZero" }
  | { kind: "none" };

/** Cambio contra el periodo anterior. Diferencias menores a 0.5 % cuentan como "igual". */
export function changeBetween(current: number, previous: number | null | undefined): Change {
  if (previous === null || previous === undefined) return { kind: "none" };
  if (previous === 0) return current === 0 ? { kind: "same" } : { kind: "fromZero" };
  const ratio = (current - previous) / previous;
  if (Math.abs(ratio) < 0.005) return { kind: "same" };
  return { kind: ratio > 0 ? "up" : "down", percent: Math.abs(ratio) };
}
