import { cookieNames } from "@/lib/auth/cookies";

/**
 * Reenvío de un archivo de actividad a la API (POST /activities/imports) sin guardarlo entero en memoria.
 *
 * Esta ruta queda fuera de Proxy: Proxy copia el cuerpo en memoria y lo trunca en silencio a partir de 10 MB
 * (`proxyClientMaxBodySize`). Aquí no se renueva el access token: solo Proxy lo hace, con un único refresh compartido
 * (la API revoca la sesión si un refresh token se usa dos veces). Antes de subir, el navegador llama a /api/sesion,
 * que pasa por Proxy y deja un access token vigente. Al ser un route handler y no una server action, Next no verifica
 * el origen: se comprueba aquí para que otro sitio no pueda subir archivos con las cookies del usuario.
 */

/** 50 MB del archivo (ADR-009) más margen para las cabeceras multipart; la API aplica el límite exacto. */
export const MAX_UPLOAD_BYTES = 51 * 1024 * 1024;

export type UploadErrorCode = "forbidden" | "badRequest" | "session" | "tooLarge" | "invalid" | "unavailable";

export type UploadResult = {
  status: number;
  body: { jobId: string } | { error: UploadErrorCode; detail?: string };
};

export type UploadContext = {
  cookie: (name: string) => string | undefined;
  apiBaseUrl: string;
  secure: boolean;
  fetchImpl?: typeof fetch;
};

const fail = (status: number, error: UploadErrorCode): UploadResult => ({ status, body: { error } });

/** Mismo origen: `Origin` coincide con el host que atendió la solicitud y el navegador no la marca como ajena. */
export function isSameOrigin(headers: Headers): boolean {
  const fetchSite = headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return false;
  }
  const origin = headers.get("origin");
  const host = headers.get("x-forwarded-host") ?? headers.get("host");
  if (!origin || !host) {
    return false;
  }
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function forwardImport(request: Request, context: UploadContext): Promise<UploadResult> {
  const fetchImpl = context.fetchImpl ?? fetch;

  if (!isSameOrigin(request.headers)) {
    return fail(403, "forbidden");
  }
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data") || !request.body) {
    return fail(400, "badRequest");
  }
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_UPLOAD_BYTES) {
    return fail(413, "tooLarge");
  }

  const access = context.cookie(cookieNames(context.secure).access);
  if (!access) {
    return fail(401, "session");
  }

  let response: Response;
  try {
    response = await fetchImpl(`${context.apiBaseUrl.replace(/\/$/, "")}/api/v1/activities/imports`, {
      method: "POST",
      headers: { "Content-Type": contentType, Authorization: `Bearer ${access}` },
      body: request.body,
      // Se reenvía el flujo tal como llega: el archivo nunca está completo en memoria de Next.
      duplex: "half",
      cache: "no-store",
    } as RequestInit);
  } catch {
    return fail(502, "unavailable");
  }

  if (response.status === 202) {
    const accepted = (await response.json()) as { jobId: string };
    return { status: 202, body: { jobId: accepted.jobId } };
  }
  if (response.status === 401) {
    return fail(401, "session");
  }
  if (response.status === 413) {
    return fail(413, "tooLarge");
  }
  if (response.status === 400 || response.status === 404) {
    const problem = (await response.json().catch(() => ({}))) as { detail?: string };
    return { status: 400, body: { error: "invalid", detail: problem.detail } };
  }
  return fail(502, "unavailable");
}
