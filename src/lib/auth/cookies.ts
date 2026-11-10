/**
 * Cookies de sesión del BFF (ADR-014). Módulo sin dependencias de Next para poder usarlo desde Proxy, server
 * actions y pruebas. Los tokens nunca llegan a JavaScript del navegador: siempre HttpOnly.
 */

/** Margen para que el access token de la cookie caduque antes que en la API y Proxy lo renueve a tiempo. */
export const ACCESS_EXPIRY_MARGIN_SECONDS = 30;

/** En producción (HTTPS) se usa el prefijo `__Host-`, que exige Secure, Path=/ y sin Domain. */
export function cookieNames(secure: boolean) {
  const prefix = secure ? "__Host-" : "";
  return {
    access: `${prefix}velora-access`,
    refresh: `${prefix}velora-refresh`,
  } as const;
}

export type CookieOptions = {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: "/";
  maxAge: number;
};

export function cookieOptions(secure: boolean, maxAgeSeconds: number): CookieOptions {
  return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: Math.max(1, Math.floor(maxAgeSeconds)) };
}

/**
 * Opciones para borrar una cookie de sesión. Deben repetir Secure/Path/HttpOnly: un navegador rechaza una cookie
 * `__Host-` sin Secure, así que un borrado sin esos atributos se ignoraría y la sesión seguiría viva.
 */
export function expiredCookieOptions(secure: boolean) {
  return { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 0 } as const;
}

/** Respuesta de /auth/login y /auth/refresh (contrato TokenResponse). */
export type TokenPair = {
  accessToken: string;
  accessTokenExpiresIn: number;
  refreshToken: string;
  refreshTokenExpiresIn: number;
};

/** Cookies a escribir para un par de tokens. */
export function tokenCookies(pair: TokenPair, secure: boolean) {
  const names = cookieNames(secure);
  return [
    {
      name: names.access,
      value: pair.accessToken,
      options: cookieOptions(secure, pair.accessTokenExpiresIn - ACCESS_EXPIRY_MARGIN_SECONDS),
    },
    { name: names.refresh, value: pair.refreshToken, options: cookieOptions(secure, pair.refreshTokenExpiresIn) },
  ];
}

/**
 * Ruta interna segura para volver tras el login. Evita redirecciones abiertas: solo rutas absolutas del propio sitio
 * (`/algo`), nunca `//otro.dominio`, `/\\otro`, URLs completas ni la propia página de login.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  if (next === "/login" || next.startsWith("/login?") || next.startsWith("/login/")) {
    return "/";
  }
  return next;
}
