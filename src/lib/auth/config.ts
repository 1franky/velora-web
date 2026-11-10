/** Configuración del BFF leída del entorno del servidor. Nunca se expone al navegador (sin prefijo NEXT_PUBLIC_). */
export function apiBaseUrl(): string {
  const url = process.env.VELORA_API_URL;
  if (!url) {
    throw new Error("Falta VELORA_API_URL (URL de velora-api visible solo para el servidor de Next.js)");
  }
  return url;
}

/** Cookies Secure y con prefijo __Host- en producción; en desarrollo por http://localhost, sin ellos. */
export function secureCookies(): boolean {
  return process.env.VELORA_COOKIE_SECURE
    ? process.env.VELORA_COOKIE_SECURE === "true"
    : process.env.NODE_ENV === "production";
}
