import { getRequestConfig } from "next-intl/server";

/** Único idioma por ahora (AGENTS.md); los textos de interfaz viven en messages/, nunca en el código. */
export const LOCALE = "es-MX";

/** Zona inicial; la configurada por el usuario la sustituirá cuando haya sesión (Fase 3, PR de configuración). */
export const DEFAULT_TIME_ZONE = "America/Mexico_City";

export default getRequestConfig(async () => ({
  locale: LOCALE,
  timeZone: DEFAULT_TIME_ZONE,
  messages: (await import(`../../messages/${LOCALE}.json`)).default,
}));
