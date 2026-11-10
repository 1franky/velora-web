import type { TokenPair } from "./cookies";

/**
 * Renovación de tokens de un solo vuelo (ADR-014). La API rota el refresh token en cada uso y revoca la sesión si se
 * reutiliza (ADR-010): dos solicitudes simultáneas con la misma cookie no deben llamar dos veces. La primera hace la
 * llamada; las demás reciben la misma promesa, y el resultado se conserva unos segundos para las que llegan tarde
 * con la cookie anterior. Solo vive en memoria del proceso (una instancia de la web).
 */
const inFlight = new Map<string, Promise<RefreshResult>>();

/** Tiempo que se conserva el resultado para solicitudes rezagadas con el refresh token anterior. */
export const SHARE_WINDOW_MS = 30_000;

export type RefreshResult = { ok: true; pair: TokenPair } | { ok: false; reason: "invalid" | "unavailable" };

export function refreshTokens(
  refreshToken: string,
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<RefreshResult> {
  const existing = inFlight.get(refreshToken);
  if (existing) {
    return existing;
  }
  const promise = call(refreshToken, apiBaseUrl, fetchImpl);
  inFlight.set(refreshToken, promise);
  promise.finally(() => setTimeout(() => inFlight.delete(refreshToken), SHARE_WINDOW_MS).unref?.());
  return promise;
}

async function call(refreshToken: string, apiBaseUrl: string, fetchImpl: typeof fetch): Promise<RefreshResult> {
  try {
    const response = await fetchImpl(`${apiBaseUrl.replace(/\/$/, "")}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });
    if (response.ok) {
      return { ok: true, pair: (await response.json()) as TokenPair };
    }
    // 401 (expirado, revocado o reutilizado) o 400: la sesión no se puede renovar.
    return { ok: false, reason: response.status < 500 ? "invalid" : "unavailable" };
  } catch {
    return { ok: false, reason: "unavailable" };
  }
}

/** Solo para pruebas. */
export function resetRefreshState() {
  inFlight.clear();
}
