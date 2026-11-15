import { afterEach, describe, expect, it, vi } from "vitest";
import { REQUEST_ID_HEADER, newRequestId, traced } from "./traced-fetch";

const API_ID_FORMAT = /^[A-Za-z0-9._-]{8,64}$/;

describe("traced", () => {
  afterEach(() => vi.restoreAllMocks());

  it("genera ids con el formato que la API acepta", () => {
    expect(newRequestId()).toMatch(API_ID_FORMAT);
    expect(newRequestId()).not.toBe(newRequestId());
  });

  it("agrega X-Request-Id a un Request sin perder sus cabeceras", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const request = new Request("http://api.local/api/v1/me", { headers: { Authorization: "Bearer t" } });

    await traced(fetchMock)(request);

    const sent = fetchMock.mock.calls[0][0] as Request;
    expect(sent.headers.get(REQUEST_ID_HEADER)).toMatch(/^web-/);
    expect(sent.headers.get("Authorization")).toBe("Bearer t");
  });

  it("agrega X-Request-Id cuando se llama con URL e init", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));

    await traced(fetchMock)("http://api.local/api/v1/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });

    const init = fetchMock.mock.calls[0][1]!;
    const headers = new Headers(init.headers);
    expect(headers.get(REQUEST_ID_HEADER)).toMatch(API_ID_FORMAT);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init.method).toBe("POST");
    expect(init.body).toBe("{}");
  });

  it("registra un 5xx con su requestId, sin query, cabeceras ni cuerpo", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("detalle interno", { status: 503 }));

    const response = await traced(fetchMock)("http://api.local/api/v1/activities?desde=2026-01-01", {
      headers: { Authorization: "Bearer secreto" },
    });

    expect(response.status).toBe(503);
    const sentId = new Headers(fetchMock.mock.calls[0][1]!.headers).get(REQUEST_ID_HEADER);
    expect(log).toHaveBeenCalledOnce();
    const line = String(log.mock.calls[0][0]);
    expect(line).toBe(`[api] GET /api/v1/activities respondió 503 requestId=${sentId}`);
    expect(line).not.toMatch(/secreto|desde|detalle/);
  });

  it("registra y propaga un fallo de red", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new TypeError("fetch failed");
    });

    await expect(traced(fetchMock)("http://api.local/api/v1/me")).rejects.toThrow("fetch failed");
    expect(String(log.mock.calls[0][0])).toMatch(
      /^\[api\] GET \/api\/v1\/me sin respuesta \(TypeError\) requestId=web-/,
    );
  });

  it("no registra respuestas 2xx ni 4xx", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    for (const status of [200, 401, 404]) {
      await traced(vi.fn<typeof fetch>(async () => new Response(null, { status })))("http://api.local/api/v1/me");
    }
    expect(log).not.toHaveBeenCalled();
  });
});
