import { describe, expect, it } from "vitest";
import { longLabel, parsePerformance, shortLabel, toTimeseriesQuery } from "./trends";

describe("parsePerformance", () => {
  it("usa semanas, sin rodillo y sin filtros por omisión", () => {
    expect(parsePerformance({})).toEqual({ por: "semana", tipo: undefined, bici: undefined, rodillo: false });
  });

  it("lee agrupación, tipo, bicicleta y rodillo, e ignora valores inválidos", () => {
    expect(
      parsePerformance({ por: "mes", tipo: "GRAVEL", bici: "B1A1C0DE-0000-4000-8000-000000000001", rodillo: "1" }),
    ).toEqual({ por: "mes", tipo: "GRAVEL", bici: "b1a1c0de-0000-4000-8000-000000000001", rodillo: true });
    expect(parsePerformance({ por: "dia", tipo: "BMX", bici: "x", rodillo: "si" })).toEqual({
      por: "semana",
      tipo: undefined,
      bici: undefined,
      rodillo: false,
    });
  });

  it("elegir rodillo como tipo lo incluye", () => {
    expect(parsePerformance({ tipo: "INDOOR" }).rodillo).toBe(true);
  });
});

describe("toTimeseriesQuery", () => {
  it("traduce a la consulta de la API", () => {
    expect(toTimeseriesQuery({ por: "anio", tipo: "ROAD", rodillo: false })).toEqual({
      granularity: "year",
      includeIndoor: false,
      subType: "ROAD",
      bikeId: undefined,
    });
  });
});

describe("etiquetas", () => {
  it("cortas para el eje", () => {
    expect(shortLabel("2026-11-02", "week")).toBe("2 nov");
    expect(shortLabel("2026-11-01", "month")).toBe("nov");
    expect(shortLabel("2026-01-01", "year")).toBe("2026");
  });

  it("completas para la lectura y la tabla", () => {
    expect(longLabel("2026-11-02", "2026-11-08", "week")).toBe("2 nov – 8 de noviembre de 2026");
    expect(longLabel("2026-11-01", "2026-11-30", "month")).toBe("noviembre de 2026");
  });
});
