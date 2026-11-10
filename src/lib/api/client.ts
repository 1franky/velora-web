import createClient from "openapi-fetch";
import type { paths } from "./schema";

/**
 * Cliente tipado de la API de Velora, generado desde el contrato OpenAPI (ADR-011).
 *
 * Solo debe usarse en el servidor de Next.js: el navegador nunca habla con la API ni ve tokens (ADR-014).
 */
export function createApiClient(baseUrl: string, accessToken?: string, fetchImpl: typeof fetch = fetch) {
  return createClient<paths>({
    baseUrl: `${baseUrl.replace(/\/$/, "")}/api/v1`,
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    fetch: fetchImpl,
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
