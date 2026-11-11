import { describe, expect, it } from "vitest";
import { heatmapQuery, parseBbox, validTile } from "./heatmap";

describe("heatmapQuery", () => {
  it("traduce los filtros de la URL a la consulta de las teselas", () => {
    expect(
      heatmapQuery({
        desde: "2026-01-01",
        hasta: "2026-06-30",
        tipo: "GRAVEL",
        bici: "b1a1c0de-0000-4000-8000-000000000001",
      }),
    ).toBe("from=2026-01-01&to=2026-06-30&subType=GRAVEL&bikeId=b1a1c0de-0000-4000-8000-000000000001");
  });

  it("sin filtros no agrega nada y descarta las distancias", () => {
    expect(heatmapQuery({})).toBe("");
    expect(heatmapQuery({ minKm: 10, maxKm: 50 })).toBe("");
  });
});

describe("validTile", () => {
  it("acepta teselas dentro de la rejilla del zoom 0 al 16", () => {
    expect(validTile(0, 0, 0)).toBe(true);
    expect(validTile(16, 65_535, 65_535)).toBe(true);
  });

  it("rechaza zooms, columnas o filas fuera de rango y valores no enteros", () => {
    expect(validTile(17, 0, 0)).toBe(false);
    expect(validTile(2, 4, 0)).toBe(false);
    expect(validTile(2, 0, -1)).toBe(false);
    expect(validTile(1.5, 0, 0)).toBe(false);
    expect(validTile(Number.NaN, 0, 0)).toBe(false);
  });
});

describe("parseBbox", () => {
  it("lee oeste,sur,este,norte y recorta al rango del planeta", () => {
    expect(parseBbox("-99.2,19.3,-99.1,19.4")).toEqual([-99.2, 19.3, -99.1, 19.4]);
    expect(parseBbox("-200,-95,200,95")).toEqual([-180, -90, 180, 90]);
  });

  it("rechaza recuadros incompletos, invertidos o con texto", () => {
    expect(parseBbox(null)).toBeNull();
    expect(parseBbox("1,2,3")).toBeNull();
    expect(parseBbox("10,0,5,1")).toBeNull();
    expect(parseBbox("a,b,c,d")).toBeNull();
  });
});
