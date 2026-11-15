import { describe, expect, it } from "vitest";
import { callbackProblem, connectionNotice, isStravaNotice, sourceLabel } from "./connection";

describe("conexión con Strava", () => {
  it("revisa el retorno antes de llamar a la API", () => {
    const ok = { code: "c", state: "s", scope: "read,activity:read_all", error: null };
    expect(callbackProblem(ok)).toBeNull();
    expect(callbackProblem({ ...ok, error: "access_denied" })).toBe("denegado");
    expect(callbackProblem({ ...ok, code: null })).toBe("invalido");
    expect(callbackProblem({ ...ok, scope: "read" })).toBe("permiso");
    expect(callbackProblem({ ...ok, scope: null })).toBe("permiso");
  });

  it("traduce la respuesta de la API", () => {
    expect(connectionNotice(200)).toBe("conectado");
    expect(connectionNotice(400)).toBe("invalido");
    expect(connectionNotice(409)).toBe("otra-cuenta");
    expect(connectionNotice(502)).toBe("error");
    expect(connectionNotice(404)).toBe("error");
  });

  it("solo acepta avisos conocidos y nombra el origen", () => {
    expect(isStravaNotice("conectado")).toBe(true);
    expect(isStravaNotice("<script>")).toBe(false);
    expect(sourceLabel("STRAVA")).toBe("Strava");
    expect(sourceLabel("FIT")).toBe("FIT");
  });
});
