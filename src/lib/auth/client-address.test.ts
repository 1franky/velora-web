import { describe, expect, it } from "vitest";
import { clientAddress } from "./client-address";

describe("clientAddress", () => {
  it("prefiere cf-connecting-ip", () => {
    const headers = new Headers({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" });
    expect(clientAddress(headers)).toBe("203.0.113.7");
  });

  it("acepta IPv6", () => {
    expect(clientAddress(new Headers({ "cf-connecting-ip": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("sin Cloudflare usa la última entrada de x-forwarded-for, no la que agrega el cliente", () => {
    const headers = new Headers({ "x-forwarded-for": "198.51.100.1, 203.0.113.7" });
    expect(clientAddress(headers)).toBe("203.0.113.7");
  });

  it("descarta valores que no son IP", () => {
    expect(clientAddress(new Headers({ "cf-connecting-ip": "no-es-ip" }))).toBeUndefined();
    expect(clientAddress(new Headers({ "x-forwarded-for": "203.0.113.7, basura" }))).toBeUndefined();
  });

  it("sin encabezados no hay IP que reenviar", () => {
    expect(clientAddress(new Headers())).toBeUndefined();
  });
});
