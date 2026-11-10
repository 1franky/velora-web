import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";

describe("createApiClient", () => {
  it("usa /api/v1, el access token y devuelve datos tipados", async () => {
    const fetchMock = vi.fn<(request: Request) => Promise<Response>>(async () =>
      Response.json({
        id: "6f1c3c62-5a0e-4a4e-9a51-0b2c8f8d2f10",
        email: "propietario@example.com",
        preferences: { locale: "es-MX", timeZone: "America/Mexico_City", distanceUnit: "km", elevationUnit: "m" },
      }),
    );
    const api = createApiClient("http://api.local/", "token-de-prueba", fetchMock as unknown as typeof fetch);

    const { data, error } = await api.GET("/me");

    expect(error).toBeUndefined();
    expect(data?.preferences.timeZone).toBe("America/Mexico_City");
    const request = fetchMock.mock.calls[0][0];
    expect(request.url).toBe("http://api.local/api/v1/me");
    expect(request.headers.get("Authorization")).toBe("Bearer token-de-prueba");
  });

  it("devuelve el Problem Details de la API como error", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json(
        { title: "No autenticado", status: 401, detail: "Inicia sesión para continuar." },
        { status: 401, headers: { "Content-Type": "application/problem+json" } },
      ),
    );
    const api = createApiClient("http://api.local", undefined, fetchMock as unknown as typeof fetch);

    const { data, error } = await api.GET("/me");

    expect(data).toBeUndefined();
    expect(error).toMatchObject({ status: 401, title: "No autenticado" });
  });
});
