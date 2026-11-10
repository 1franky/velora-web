import { describe, expect, it } from "vitest";
import { isValidTimeZone, parseActivityForm, parseBikeForm, parseDeviceForm } from "./forms";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  Object.entries(entries).forEach(([key, value]) => data.set(key, value));
  return data;
};

describe("parseBikeForm", () => {
  it("limpia espacios, vacía los opcionales y acepta coma decimal en el peso", () => {
    expect(
      parseBikeForm(form({ name: "  Grava ", bikeType: "GRAVEL", brand: " ", model: "X1", weightKg: "9,5" })),
    ).toEqual({
      ok: true,
      value: { name: "Grava", bikeType: "GRAVEL", brand: null, model: "X1", weightKg: 9.5 },
    });
  });

  it("explica cada campo inválido", () => {
    expect(parseBikeForm(form({ name: "", bikeType: "BMX", weightKg: "80", brand: "x".repeat(101) }))).toEqual({
      ok: false,
      fields: { name: "required", bikeType: "invalid", brand: "tooLong", weightKg: "range" },
    });
    expect(parseBikeForm(form({ name: "A", bikeType: "MTB", weightKg: "pesada" }))).toMatchObject({
      fields: { weightKg: "invalid" },
    });
  });
});

describe("parseDeviceForm", () => {
  it("exige el nombre y vacía los opcionales", () => {
    expect(parseDeviceForm(form({ displayName: "Edge 540", manufacturer: "", model: "" }))).toEqual({
      ok: true,
      value: { displayName: "Edge 540", manufacturer: null, model: null },
    });
    expect(parseDeviceForm(form({ displayName: " " }))).toEqual({ ok: false, fields: { displayName: "required" } });
  });
});

describe("parseActivityForm", () => {
  it("convierte la bicicleta vacía en null para quitarla", () => {
    expect(parseActivityForm(form({ title: " Ajusco ", subType: "ROAD", bikeId: "" }))).toEqual({
      ok: true,
      value: { title: "Ajusco", subType: "ROAD", bikeId: null },
    });
  });

  it("rechaza títulos vacíos o largos, tipos y bicicletas inválidos", () => {
    expect(parseActivityForm(form({ title: "x".repeat(201), subType: "", bikeId: "no-uuid" }))).toEqual({
      ok: false,
      fields: { title: "tooLong", subType: "required", bikeId: "invalid" },
    });
  });
});

describe("isValidTimeZone", () => {
  it("acepta zonas IANA y rechaza el resto", () => {
    expect(isValidTimeZone("America/Mexico_City")).toBe(true);
    expect(isValidTimeZone("America/Tijuana")).toBe(true);
    expect(isValidTimeZone("Marte/Olympus")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
