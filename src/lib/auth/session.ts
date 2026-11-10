import "server-only";
import { cookies } from "next/headers";
import { createApiClient } from "@/lib/api/client";
import { apiBaseUrl, secureCookies } from "./config";
import { cookieNames, expiredCookieOptions, tokenCookies, type TokenPair } from "./cookies";

/**
 * Capa de acceso a datos de la sesión (patrón DAL de Next). Solo en el servidor: el navegador nunca ve los tokens.
 * Leer cookies es una lectura de solicitud: los componentes que la usan deben ir detrás de un <Suspense>.
 */
export async function accessToken(): Promise<string | undefined> {
  return (await cookies()).get(cookieNames(secureCookies()).access)?.value;
}

/** Cliente de la API autenticado con el access token de la solicitud. */
export async function api() {
  return createApiClient(apiBaseUrl(), await accessToken());
}

/** Solo en server actions o route handlers (escribir cookies durante el render no está permitido). */
export async function storeTokens(pair: TokenPair) {
  const store = await cookies();
  for (const cookie of tokenCookies(pair, secureCookies())) {
    store.set(cookie.name, cookie.value, cookie.options);
  }
}

/** Devuelve el refresh token y borra ambas cookies. Solo en server actions o route handlers. */
export async function takeAndClearTokens(): Promise<string | undefined> {
  const store = await cookies();
  const names = cookieNames(secureCookies());
  const refresh = store.get(names.refresh)?.value;
  store.set(names.access, "", expiredCookieOptions(secureCookies()));
  store.set(names.refresh, "", expiredCookieOptions(secureCookies()));
  return refresh;
}
