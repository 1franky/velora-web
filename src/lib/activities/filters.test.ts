import { describe, expect, it } from "vitest";
import { hasFilters, parseFilters, sanitizeQuery, toApiQuery } from "./filters";

describe("parseFilters", () => {
  it("lee filtros válidos de la URL", () => {
    expect(
      parseFilters({
        desde: "2026-01-01",
        hasta: "2026-03-31",
        tipo: "GRAVEL",
        bici: "6F1C3C62-5A0E-4A4E-9A51-0B2C8F8D2F10",
        minKm: "20",
        maxKm: "80,5",
      }),
    ).toEqual({
      desde: "2026-01-01",
      hasta: "2026-03-31",
      tipo: "GRAVEL",
      bici: "6f1c3c62-5a0e-4a4e-9a51-0b2c8f8d2f10",
      minKm: 20,
      maxKm: 80.5,
    });
  });

  it("ignora valores inválidos en lugar de fallar", () => {
    expect(
      parseFilters({
        desde: "2026-02-30",
        hasta: "ayer",
        tipo: "BMX",
        bici: "no-es-uuid",
        minKm: "-3",
        maxKm: "1e9",
      }),
    ).toEqual({});
  });

  it("toma el primer valor si un parámetro se repite y descarta los vacíos", () => {
    expect(parseFilters({ tipo: ["ROAD", "GRAVEL"], desde: "  " })).toEqual({ tipo: "ROAD" });
  });

  it("intercambia rangos invertidos", () => {
    expect(parseFilters({ desde: "2026-05-01", hasta: "2026-04-01", minKm: "50", maxKm: "10" })).toMatchObject({
      desde: "2026-04-01",
      hasta: "2026-05-01",
      minKm: 10,
      maxKm: 50,
    });
  });
});

describe("toApiQuery", () => {
  it("convierte kilómetros a metros y renombra los parámetros", () => {
    expect(toApiQuery({ desde: "2026-01-01", tipo: "ROAD", minKm: 12.3456 })).toEqual({
      from: "2026-01-01",
      to: undefined,
      subType: "ROAD",
      bikeId: undefined,
      minDistanceM: 12346,
      maxDistanceM: undefined,
    });
  });
});

describe("sanitizeQuery", () => {
  it("aplica las mismas reglas a una consulta que llega del navegador", () => {
    expect(
      sanitizeQuery({ from: "2026-01-01", subType: "PATINETA" as never, minDistanceM: 5000, maxDistanceM: -1 }),
    ).toEqual(toApiQuery({ desde: "2026-01-01", minKm: 5 }));
  });
});

describe("hasFilters", () => {
  it("distingue una lista filtrada de una sin filtros", () => {
    expect(hasFilters({})).toBe(false);
    expect(hasFilters({ tipo: "INDOOR" })).toBe(true);
  });
});
