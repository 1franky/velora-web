import { describe, expect, it } from "vitest";
import { deletionFailure, parseDeletionForm } from "./deletion";
import { exportFailure, isExportFailure } from "./export";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

describe("parseDeletionForm", () => {
  it("exige escribir BORRAR exactamente", () => {
    expect(parseDeletionForm(form({ confirmation: "borrar", password: "x" }))).toEqual({ ok: false, error: "confirm" });
    expect(parseDeletionForm(form({ password: "x" }))).toEqual({ ok: false, error: "confirm" });
  });

  it("exige la contraseña", () => {
    expect(parseDeletionForm(form({ confirmation: "BORRAR", password: "" }))).toEqual({ ok: false, error: "password" });
  });

  it("acepta la confirmación con espacios alrededor y conserva la contraseña tal cual", () => {
    expect(parseDeletionForm(form({ confirmation: " BORRAR ", password: " secreta " }))).toEqual({
      ok: true,
      password: " secreta ",
    });
  });
});

describe("deletionFailure", () => {
  it("distingue contraseña incorrecta, límite, sesión y error", () => {
    expect(deletionFailure(403, null)).toEqual({ status: "error", error: "wrongPassword" });
    expect(deletionFailure(429, "90")).toEqual({ status: "error", error: "tooMany", minutes: 2 });
    expect(deletionFailure(429, null)).toEqual({ status: "error", error: "tooMany", minutes: 1 });
    expect(deletionFailure(401, null)).toEqual({ status: "error", error: "session" });
    expect(deletionFailure(500, null)).toEqual({ status: "error", error: "unavailable" });
  });
});

describe("exportFailure", () => {
  it("traduce el estado de la API a un motivo para la URL", () => {
    expect(exportFailure(409)).toBe("en-curso");
    expect(exportFailure(401)).toBe("sesion");
    expect(exportFailure(502)).toBe("error");
    expect(isExportFailure("en-curso")).toBe(true);
    expect(isExportFailure("otra-cosa")).toBe(false);
  });
});
