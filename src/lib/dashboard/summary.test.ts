import { describe, expect, it } from "vitest";
import { changeBetween, parsePeriod } from "./summary";

describe("parsePeriod", () => {
  it("acepta los periodos en español y usa el mes por defecto", () => {
    expect(parsePeriod("semana")).toBe("semana");
    expect(parsePeriod("año")).toBe("año");
    expect(parsePeriod(["todo", "mes"])).toBe("todo");
    expect(parsePeriod(undefined)).toBe("mes");
    expect(parsePeriod("week")).toBe("mes");
    expect(parsePeriod("toString")).toBe("mes");
  });
});

describe("changeBetween", () => {
  it("calcula subidas y bajadas relativas al periodo anterior", () => {
    expect(changeBetween(112, 100)).toEqual({ kind: "up", percent: 0.12 });
    expect(changeBetween(25, 100)).toEqual({ kind: "down", percent: 0.75 });
  });

  it("trata como igual una diferencia mínima", () => {
    expect(changeBetween(100.2, 100)).toEqual({ kind: "same" });
    expect(changeBetween(0, 0)).toEqual({ kind: "same" });
  });

  it("no inventa un porcentaje si el periodo anterior fue cero o no existe", () => {
    expect(changeBetween(40, 0)).toEqual({ kind: "fromZero" });
    expect(changeBetween(40, null)).toEqual({ kind: "none" });
  });
});
