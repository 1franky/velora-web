import { describe, expect, it } from "vitest";
import { ACCESS_EXPIRY_MARGIN_SECONDS, cookieNames, expiredCookieOptions, safeNextPath, tokenCookies } from "./cookies";

describe("cookies de sesión", () => {
  it("usa el prefijo __Host- solo con Secure", () => {
    expect(cookieNames(true)).toEqual({ access: "__Host-velora-access", refresh: "__Host-velora-refresh" });
    expect(cookieNames(false)).toEqual({ access: "velora-access", refresh: "velora-refresh" });
  });

  it("son HttpOnly, SameSite=Lax y el access caduca antes que en la API", () => {
    const [access, refresh] = tokenCookies(
      { accessToken: "a", accessTokenExpiresIn: 900, refreshToken: "r", refreshTokenExpiresIn: 2_592_000 },
      true,
    );
    expect(access.options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 900 - ACCESS_EXPIRY_MARGIN_SECONDS,
    });
    expect(refresh.options.maxAge).toBe(2_592_000);
  });

  it("borra con los mismos atributos (un __Host- sin Secure se ignoraría)", () => {
    expect(expiredCookieOptions(true)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
  });
});

describe("safeNextPath (evita redirecciones abiertas)", () => {
  it.each([
    ["/actividades?page=2", "/actividades?page=2"],
    ["/", "/"],
    [null, "/"],
    ["", "/"],
    ["https://otro.example", "/"],
    ["//otro.example/ruta", "/"],
    ["/\\otro.example", "/"],
    ["javascript:alert(1)", "/"],
    ["/login", "/"],
    ["/login?next=/x", "/"],
  ])("%s → %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});
