/**
 * Correlation ID hacia la API: cada llamada lleva un `X-Request-Id` propio, que la API pone en sus logs y usa como
 * `errorId` de los 500. Si la llamada falla (5xx o red caída), la web lo registra con ese mismo id, así un fallo visto
 * aquí se encuentra en los logs de la API. Nunca registra cabeceras, cuerpos ni la query.
 */
export const REQUEST_ID_HEADER = "X-Request-Id";

/** Formato que la API acepta (8 a 64 de `[A-Za-z0-9._-]`); el prefijo distingue las llamadas de la web. */
export function newRequestId(): string {
  return `web-${crypto.randomUUID()}`;
}

export function traced(fetchImpl: typeof fetch): typeof fetch {
  return async (input, init) => {
    const requestId = newRequestId();
    let method: string;
    let url: string;
    if (input instanceof Request) {
      // openapi-fetch entrega un Request: sus cabeceras se pueden modificar antes de enviarlo.
      input.headers.set(REQUEST_ID_HEADER, requestId);
      method = input.method;
      url = input.url;
    } else {
      const headers = new Headers(init?.headers);
      headers.set(REQUEST_ID_HEADER, requestId);
      init = { ...init, headers };
      method = init.method ?? "GET";
      url = input.toString();
    }
    const where = `${method.toUpperCase()} ${pathOf(url)}`;
    let response: Response;
    try {
      response = await fetchImpl(input, init);
    } catch (error) {
      console.error(`[api] ${where} sin respuesta (${errorName(error)}) requestId=${requestId}`);
      throw error;
    }
    if (response.status >= 500) {
      console.error(`[api] ${where} respondió ${response.status} requestId=${requestId}`);
    }
    return response;
  };
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url.split("?")[0];
  }
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "error";
}
