/**
 * Conexión con Strava (ADR-030): avisos de la sección en Configuración y resultado del retorno OAuth. Sin
 * dependencias del servidor, para poder probarlo.
 */
export const REQUIRED_SCOPE = "activity:read_all";

/** Avisos de `?strava=` tras conectar o desconectar. */
export const STRAVA_NOTICES = [
  "conectado",
  "desconectado",
  "denegado",
  "permiso",
  "invalido",
  "otra-cuenta",
  "error",
] as const;
export type StravaNotice = (typeof STRAVA_NOTICES)[number];

export function isStravaNotice(value: unknown): value is StravaNotice {
  return typeof value === "string" && (STRAVA_NOTICES as readonly string[]).includes(value);
}

/** Avisos que son buenas noticias; los demás se muestran como alerta. */
export function isSuccessNotice(notice: StravaNotice) {
  return notice === "conectado" || notice === "desconectado";
}

/** Lo que Strava devolvió en el retorno, antes de llamar a la API. */
export type CallbackParams = { code: string | null; state: string | null; scope: string | null; error: string | null };

/** `null` si se puede completar la conexión; si no, el aviso que hay que mostrar. */
export function callbackProblem(params: CallbackParams): StravaNotice | null {
  if (params.error) return "denegado";
  if (!params.code || !params.state) return "invalido";
  const scopes = (params.scope ?? "").split(",").map((s) => s.trim());
  return scopes.includes(REQUIRED_SCOPE) ? null : "permiso";
}

/** Respuesta de `POST /integrations/strava/connection` → aviso. */
export function connectionNotice(status: number): StravaNotice {
  if (status === 200) return "conectado";
  if (status === 400) return "invalido";
  if (status === 409) return "otra-cuenta";
  return "error";
}

/** Nombre del origen de una actividad para mostrar: los formatos de archivo tal cual, Strava con su nombre. */
export function sourceLabel(format: string) {
  return format === "STRAVA" ? "Strava" : format;
}
