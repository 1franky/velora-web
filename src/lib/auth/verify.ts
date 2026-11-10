/**
 * Validación de un access token contra la API (GET /me) para rutas que no pasan por Proxy, como los archivos del
 * mapa base (llevan extensión). Revisar solo que exista la cookie no protegería nada: cualquiera puede inventarla.
 * Para no consultar la API por cada tesela, una respuesta válida se recuerda un minuto en memoria del proceso.
 */
const VALID_FOR_MS = 60_000;
const MAX_ENTRIES = 200;
const valid = new Map<string, number>();

export async function isValidAccessToken(
  token: string | undefined,
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
  now: () => number = Date.now,
): Promise<boolean> {
  if (!token) {
    return false;
  }
  const until = valid.get(token);
  if (until !== undefined && until > now()) {
    return true;
  }
  valid.delete(token);
  try {
    const response = await fetchImpl(`${apiBaseUrl.replace(/\/$/, "")}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) {
      return false;
    }
  } catch {
    return false;
  }
  if (valid.size >= MAX_ENTRIES) {
    valid.delete(valid.keys().next().value as string);
  }
  valid.set(token, now() + VALID_FOR_MS);
  return true;
}

/** Solo para pruebas. */
export function resetVerifiedTokens() {
  valid.clear();
}
