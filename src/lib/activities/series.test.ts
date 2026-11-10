import { describe, expect, it } from "vitest";
import { nearestIndex, prepareSeries } from "./series";

const range = (n: number, f: (i: number) => number | null) => Array.from({ length: n }, (_, i) => f(i));

describe("prepareSeries", () => {
  it("conserva todas las muestras si caben y convierte la velocidad a km/h", () => {
    const prepared = prepareSeries(
      { TIME: [0, 1000, 2000], DISTANCE: [0, 5, 10], SPEED: [5, 5, null], ALTITUDE: [2000, 2001, 2003] },
      3,
    );

    expect(prepared.pointCount).toBe(3);
    expect(prepared.distanceKm).toEqual([0, 0.005, 0.01]);
    expect(prepared.elapsedSeconds).toEqual([0, 1, 2]);
    expect(prepared.series.map((s) => s.key)).toEqual(["ALTITUDE", "SPEED"]);
    expect(prepared.series[1]).toEqual({ key: "SPEED", values: [18, 18, null], min: 18, max: 18 });
    expect(prepared.positions).toBeNull();
  });

  it("promedia por tramos sin esconder los picos en mínimo y máximo", () => {
    const power = range(10_000, (i) => (i === 7_777 ? 1_200 : 200));
    const prepared = prepareSeries({ POWER: power, TIME: range(10_000, (i) => i * 1000) }, 10_000, 100);

    expect(prepared.pointCount).toBe(100);
    expect(prepared.series[0].values).toHaveLength(100);
    expect(Math.max(...(prepared.series[0].values as number[]))).toBeLessThan(220); // el pico se diluye al graficar…
    expect(prepared.series[0].max).toBe(1_200); // …pero el máximo es el real
    expect(prepared.series[0].min).toBe(200);
  });

  it("omite series sin datos y conserva huecos", () => {
    const prepared = prepareSeries({ HEART_RATE: [null, null], CADENCE: [80, null], TIME: [0, 1000] }, 2);

    expect(prepared.series.map((s) => s.key)).toEqual(["CADENCE"]);
    expect(prepared.series[0].values).toEqual([80, null]);
    expect(prepared.distanceKm).toBeNull();
  });

  it("toma la posición de una misma muestra para latitud y longitud", () => {
    const prepared = prepareSeries(
      { LATITUDE: [null, 20.1, 20.2, 20.3], LONGITUDE: [null, -100.1, -100.2, -100.3] },
      4,
      2,
    );

    expect(prepared.positions).toEqual([
      [-100.1, 20.1],
      [-100.2, 20.2],
    ]);
  });
});

describe("nearestIndex", () => {
  it("encuentra el punto más cercano en un eje ascendente", () => {
    const axis = [0, 1, 2.5, 4, null, 7];
    expect(nearestIndex(axis, -3)).toBe(0);
    expect(nearestIndex(axis, 2.2)).toBe(2);
    expect(nearestIndex(axis, 3.4)).toBe(3);
    expect(nearestIndex(axis, 99)).toBe(5);
  });
});
