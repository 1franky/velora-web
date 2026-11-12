/**
 * Quién pide el mapa base y desde dónde. Módulo sin dependencias de Next para probarlo directo.
 *
 * El navegador manda el access token en su cookie HttpOnly; la app de Android (ADR-024) no tiene cookies y lo manda
 * en `Authorization: Bearer`. Si llegan los dos, manda la cookie: es lo que la web siempre ha usado.
 */
export function requestAccessToken(headers: Headers, cookieToken: string | undefined): string | undefined {
  if (cookieToken) return cookieToken;
  const match = /^Bearer\s+(\S+)$/i.exec(headers.get("authorization") ?? "");
  return match?.[1];
}

/**
 * Origen público del sitio, para las URL absolutas del estilo (MapLibre Native no resuelve rutas relativas). Detrás
 * del túnel de Cloudflare, el host y el esquema reales llegan en `x-forwarded-*`.
 */
export function publicOrigin(headers: Headers, fallback: string): string {
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!host || !/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return fallback;
  const proto = (headers.get("x-forwarded-proto") ?? new URL(fallback).protocol.replace(":", "")).split(",")[0].trim();
  return `${proto === "https" ? "https" : "http"}://${host}`;
}
