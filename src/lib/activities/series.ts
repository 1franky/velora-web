/**
 * Series de una actividad listas para graficar. La API entrega una muestra por segundo (o por registro) en unidades
 * SI; una rodada de 4 h son ~14 000 muestras por serie. Para el navegador basta con ~1 200 puntos: se promedia por
 * tramos, pero el mínimo y el máximo se calculan con todas las muestras para no esconder picos.
 */
export const CHART_SERIES = ["ALTITUDE", "SPEED", "HEART_RATE", "POWER", "CADENCE", "TEMPERATURE"] as const;
export type ChartSeriesKey = (typeof CHART_SERIES)[number];

export const MAX_POINTS = 1200;

type RawStreams = Record<string, (number | null)[]>;

export type ChartSeries = {
  key: ChartSeriesKey;
  values: (number | null)[];
  min: number;
  max: number;
};

export type PreparedSeries = {
  /** Kilómetros recorridos en cada punto, o null si la actividad no tiene distancia (p. ej. rodillo sin sensor). */
  distanceKm: (number | null)[] | null;
  /** Segundos desde el inicio en cada punto, o null sin serie de tiempo. */
  elapsedSeconds: (number | null)[] | null;
  series: ChartSeries[];
  /** Posición en cada punto para seguirla en el mapa; null si no hay GPS. */
  positions: ([number, number] | null)[] | null;
  pointCount: number;
};

/** Conversión de SI a las unidades que se muestran. */
const TO_DISPLAY: Partial<Record<ChartSeriesKey, (value: number) => number>> = {
  SPEED: (mps) => mps * 3.6,
};

function hasData(values: (number | null)[] | undefined): values is (number | null)[] {
  return Boolean(values?.some((value) => value !== null && Number.isFinite(value)));
}

/** Índices [inicio, fin) de cada tramo. */
function buckets(sampleCount: number, maxPoints: number): [number, number][] {
  if (sampleCount <= maxPoints) {
    return Array.from({ length: sampleCount }, (_, i) => [i, i + 1]);
  }
  const size = sampleCount / maxPoints;
  return Array.from({ length: maxPoints }, (_, b) => [Math.floor(b * size), Math.floor((b + 1) * size)]);
}

function mean(values: (number | null)[], [start, end]: [number, number]): number | null {
  let sum = 0;
  let count = 0;
  for (let i = start; i < end; i++) {
    const value = values[i];
    if (value !== null && value !== undefined && Number.isFinite(value)) {
      sum += value;
      count++;
    }
  }
  return count ? sum / count : null;
}

/** Índice con dato más cercano al centro del tramo (distancia, tiempo y posición no se promedian), o -1. */
function middleIndex(values: (number | null)[], [start, end]: [number, number]): number {
  const middle = Math.floor((start + end - 1) / 2);
  for (let offset = 0; offset <= end - start; offset++) {
    for (const i of [middle - offset, middle + offset]) {
      if (i >= start && i < end && values[i] !== null && values[i] !== undefined) {
        return i;
      }
    }
  }
  return -1;
}

function nearestToMiddle(values: (number | null)[], range: [number, number]): number | null {
  const index = middleIndex(values, range);
  return index === -1 ? null : values[index];
}

export function prepareSeries(streams: RawStreams, sampleCount: number, maxPoints = MAX_POINTS): PreparedSeries {
  const ranges = buckets(sampleCount, maxPoints);
  const distance = hasData(streams.DISTANCE) ? streams.DISTANCE : null;
  const time = hasData(streams.TIME) ? streams.TIME : null;
  const lat = streams.LATITUDE;
  const lon = streams.LONGITUDE;

  const series: ChartSeries[] = [];
  for (const key of CHART_SERIES) {
    const raw = streams[key];
    if (!hasData(raw)) continue;
    const convert = TO_DISPLAY[key] ?? ((value: number) => value);
    let min = Infinity;
    let max = -Infinity;
    for (const value of raw) {
      if (value !== null && Number.isFinite(value)) {
        min = Math.min(min, value);
        max = Math.max(max, value);
      }
    }
    series.push({
      key,
      values: ranges.map((range) => {
        const value = mean(raw, range);
        return value === null ? null : convert(value);
      }),
      min: convert(min),
      max: convert(max),
    });
  }

  return {
    distanceKm: distance
      ? ranges.map((range) => {
          const meters = nearestToMiddle(distance, range);
          return meters === null ? null : meters / 1000;
        })
      : null,
    elapsedSeconds: time
      ? ranges.map((range) => {
          const ms = nearestToMiddle(time, range);
          return ms === null ? null : ms / 1000;
        })
      : null,
    series,
    positions:
      hasData(lat) && hasData(lon)
        ? ranges.map((range) => {
            const index = middleIndex(lat, range);
            const latitude = lat[index];
            const longitude = lon[index];
            return index === -1 || latitude == null || longitude == null ? null : [longitude, latitude];
          })
        : null,
    pointCount: ranges.length,
  };
}

/** Índice del punto más cercano a `x`; ignora huecos. Lineal: con ~1 200 puntos es inmediato. */
export function nearestIndex(axis: (number | null)[], x: number): number {
  let best = 0;
  let bestDistance = Infinity;
  axis.forEach((value, index) => {
    if (value === null) return;
    const distance = Math.abs(value - x);
    if (distance < bestDistance) {
      best = index;
      bestDistance = distance;
    }
  });
  return best;
}
