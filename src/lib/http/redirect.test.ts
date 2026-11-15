import { describe, expect, it } from "vitest";
import { redirectTo } from "./redirect";

describe("redirectTo", () => {
  it("redirige con 303 y Location relativo, sin el host interno", () => {
    const response = redirectTo("/configuracion?strava=conectado#strava");
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe("/configuracion?strava=conectado#strava");
  });

  it("rechaza destinos fuera de la web", () => {
    expect(() => redirectTo("https://localhost:3000/configuracion")).toThrow();
    expect(() => redirectTo("//otro.example/configuracion")).toThrow();
  });
});
