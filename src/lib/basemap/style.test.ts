import { describe, expect, it } from "vitest";
import { ATTRIBUTION, basemapStyle, trackZoomFor } from "./style";

const ORIGIN = "https://velora.example";

describe("basemapStyle", () => {
  it("lee el recorte, las fuentes y los iconos del propio sitio", () => {
    const style = basemapStyle("light", ORIGIN, true);

    expect(style.sources.protomaps).toEqual({
      type: "vector",
      url: "pmtiles://https://velora.example/mapa/mexico.pmtiles",
      attribution: ATTRIBUTION,
    });
    expect(style.glyphs).toBe("https://velora.example/mapa/fonts/{fontstack}/{range}.pbf");
    expect(style.sprite).toBe("https://velora.example/mapa/sprites/light");
    expect(JSON.stringify(style)).not.toMatch(/protomaps\.github\.io|api\.protomaps\.com|tile\.openstreetmap/);
  });

  it("usa etiquetas en español y la paleta de cada tema", () => {
    const light = basemapStyle("light", ORIGIN, true);
    const dark = basemapStyle("dark", ORIGIN, true);

    expect(JSON.stringify(light.layers)).toContain("name:es");
    expect(JSON.stringify(light.layers)).toContain("#eef1f3");
    expect(JSON.stringify(dark.layers)).toContain("#121a24");
    expect(dark.sprite).toBe("https://velora.example/mapa/sprites/dark");
  });

  it("sin el archivo instalado, solo dibuja un fondo y no pide nada al servidor", () => {
    const style = basemapStyle("dark", ORIGIN, false);

    expect(style.sources).toEqual({});
    expect(style.glyphs).toBeUndefined();
    expect(style.layers).toEqual([{ id: "fondo", type: "background", paint: { "background-color": "#121a24" } }]);
  });
});

describe("trackZoomFor", () => {
  it("pide el recorrido con el zoom entero superior, dentro de 0–22", () => {
    expect(trackZoomFor(12.2)).toBe(13);
    expect(trackZoomFor(14)).toBe(14);
    expect(trackZoomFor(-1)).toBe(0);
    expect(trackZoomFor(23.5)).toBe(22);
  });
});
