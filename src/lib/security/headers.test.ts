import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./headers";

describe("securityHeaders", () => {
  it("solo permite el propio sitio y bloquea iframes y plugins", () => {
    const csp = contentSecurityPolicy(false);
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toMatch(/https?:\/\//);
    expect(csp).not.toContain("unsafe-eval");
  });

  it("en desarrollo permite lo que necesita el recargado en caliente", () => {
    const csp = contentSecurityPolicy(true);
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).toContain("connect-src 'self' ws:");
  });

  it("incluye HSTS, nosniff y sin referrer a otros sitios", () => {
    const headers = Object.fromEntries(securityHeaders(false).map(({ key, value }) => [key, value]));
    expect(headers["Strict-Transport-Security"]).toContain("max-age=31536000");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
    expect(headers["Referrer-Policy"]).toBe("same-origin");
    expect(headers["Permissions-Policy"]).toContain("geolocation=()");
  });
});
