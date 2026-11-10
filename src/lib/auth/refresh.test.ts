import { afterEach, describe, expect, it, vi } from "vitest";
import { refreshTokens, resetRefreshState } from "./refresh";

const pair = { accessToken: "a2", accessTokenExpiresIn: 900, refreshToken: "r2", refreshTokenExpiresIn: 100 };

afterEach(() => resetRefreshState());

describe("refreshTokens", () => {
  it("hace una sola llamada aunque lleguen varias solicitudes con el mismo refresh token", async () => {
    let release: (value: Response) => void = () => {};
    const fetchMock = vi.fn(() => new Promise<Response>((resolve) => (release = resolve)));

    const calls = [1, 2, 3].map(() => refreshTokens("r1", "http://api.local", fetchMock as unknown as typeof fetch));
    release(Response.json(pair));
    const results = await Promise.all(calls);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.ok && r.pair.refreshToken === "r2")).toBe(true);
    // Una solicitud rezagada con la cookie anterior recibe el mismo resultado sin volver a llamar.
    await refreshTokens("r1", "http://api.local", fetchMock as unknown as typeof fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("envía el refresh token a /api/v1/auth/refresh", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => Response.json(pair));

    await refreshTokens("r1", "http://api.local/", fetchMock as unknown as typeof fetch);

    expect(fetchMock.mock.calls[0][0]).toBe("http://api.local/api/v1/auth/refresh");
    expect(JSON.parse(String(fetchMock.mock.calls[0][1].body))).toEqual({ refreshToken: "r1" });
  });

  it("distingue sesión inválida de API no disponible", async () => {
    const unauthorized = vi.fn(async () => new Response(null, { status: 401 }));
    const down = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    const serverError = vi.fn(async () => new Response(null, { status: 503 }));

    expect(await refreshTokens("x", "http://api", unauthorized as unknown as typeof fetch)).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await refreshTokens("y", "http://api", down as unknown as typeof fetch)).toEqual({
      ok: false,
      reason: "unavailable",
    });
    expect(await refreshTokens("z", "http://api", serverError as unknown as typeof fetch)).toEqual({
      ok: false,
      reason: "unavailable",
    });
  });
});
