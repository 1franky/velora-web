import { describe, expect, it } from "vitest";
import { parseRange, resolveBasemapFile } from "./files";

const DIR = "/srv/velora/basemap";

describe("resolveBasemapFile", () => {
  it("acepta el recorte, las fuentes y los iconos", () => {
    expect(resolveBasemapFile(["mexico.pmtiles"], DIR)).toMatchObject({
      path: `${DIR}/mexico.pmtiles`,
      contentType: "application/vnd.pmtiles",
    });
    expect(resolveBasemapFile(["fonts", "Noto Sans Regular", "0-255.pbf"], DIR)).toMatchObject({
      path: `${DIR}/fonts/Noto Sans Regular/0-255.pbf`,
      contentType: "application/x-protobuf",
    });
    expect(resolveBasemapFile(["sprites", "dark@2x.png"], DIR)).toMatchObject({ contentType: "image/png" });
    expect(resolveBasemapFile(["sprites", "light.json"], DIR)).toMatchObject({ contentType: "application/json" });
  });

  it.each([
    [["..", "etc", "passwd"]],
    [["fonts", "..", "..", "secreto.pbf"]],
    [["fonts", "Noto Sans Regular", "../../x.pbf"]],
    [["fonts", "Arial", "0-255.pbf"]],
    [["sprites", "light.svg"]],
    [["metadata.json"]],
    [["otro.pmtiles"]],
    [[]],
  ])("rechaza %j", (segments) => {
    expect(resolveBasemapFile(segments, DIR)).toBeNull();
  });
});

describe("parseRange", () => {
  it("sin cabecera pide el archivo completo", () => {
    expect(parseRange(null, 1000)).toBeUndefined();
  });

  it("lee rangos cerrados, abiertos y de sufijo", () => {
    expect(parseRange("bytes=0-16383", 100_000)).toEqual({ start: 0, end: 16_383 });
    expect(parseRange("bytes=500-", 1000)).toEqual({ start: 500, end: 999 });
    expect(parseRange("bytes=-100", 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange("bytes=900-5000", 1000)).toEqual({ start: 900, end: 999 });
  });

  it.each(["bytes=1000-", "bytes=5-2", "bytes=-0", "bytes=-", "bytes=0-1,5-9", "items=0-1"])("rechaza %s", (header) => {
    expect(parseRange(header, 1000)).toBeNull();
  });
});
