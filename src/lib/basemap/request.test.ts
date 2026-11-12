import { describe, expect, it } from "vitest";
import { publicOrigin, requestAccessToken } from "./request";

describe("requestAccessToken", () => {
  it("usa la cookie de la web y, sin ella, el Bearer de la app", () => {
    expect(requestAccessToken(new Headers({ authorization: "Bearer de-la-app" }), "de-la-cookie")).toBe("de-la-cookie");
    expect(requestAccessToken(new Headers({ authorization: "Bearer de-la-app" }), undefined)).toBe("de-la-app");
    expect(requestAccessToken(new Headers({ authorization: "bearer de-la-app" }), undefined)).toBe("de-la-app");
  });

  it("no acepta otros esquemas ni encabezados mal formados", () => {
    expect(requestAccessToken(new Headers({ authorization: "Basic dXN1YXJpbzpjbGF2ZQ==" }), undefined)).toBeUndefined();
    expect(requestAccessToken(new Headers({ authorization: "Bearer" }), undefined)).toBeUndefined();
    expect(requestAccessToken(new Headers({ authorization: "Bearer uno dos" }), undefined)).toBeUndefined();
    expect(requestAccessToken(new Headers(), undefined)).toBeUndefined();
  });
});

describe("publicOrigin", () => {
  it("toma el host y el esquema del proxy", () => {
    const headers = new Headers({
      host: "127.0.0.1:3000",
      "x-forwarded-host": "velora.example",
      "x-forwarded-proto": "https",
    });
    expect(publicOrigin(headers, "http://127.0.0.1:3000")).toBe("https://velora.example");
  });

  it("sin proxy usa el host de la solicitud", () => {
    expect(publicOrigin(new Headers({ host: "localhost:3100" }), "http://localhost:3100")).toBe("http://localhost:3100");
  });

  it("ignora un host que no es un nombre de host", () => {
    expect(publicOrigin(new Headers({ host: "evil.example/ruta?x=1" }), "http://localhost:3100")).toBe(
      "http://localhost:3100",
    );
  });
});
