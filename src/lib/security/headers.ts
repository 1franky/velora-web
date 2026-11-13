/**
 * Encabezados de seguridad de todas las respuestas (10-security-and-operations.md §2). Módulo sin dependencias de Next
 * para probarlo directo; lo usa `next.config.ts`.
 *
 * La política de contenido (CSP) solo permite el propio sitio: la web no carga nada de terceros (ADR-015). Next
 * inyecta scripts y estilos en línea para hidratar la página; un nonce por solicitud los distinguiría, pero obliga a
 * renderizar todo dinámicamente y Velora usa prerenderizado parcial. Aun con 'unsafe-inline', la CSP impide cargar
 * scripts de otro origen y mandar datos a otro servidor, que es lo que importa para una página con tracks privados.
 */
export type Header = { key: string; value: string };

export function contentSecurityPolicy(development: boolean): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'unsafe-eval' solo en desarrollo: lo exige el recargado en caliente de React.
    "script-src": ["'self'", "'unsafe-inline'", ...(development ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // MapLibre arma imágenes de iconos y fuentes en blob: y data:.
    "img-src": ["'self'", "data:", "blob:"],
    "font-src": ["'self'"],
    // Teselas, estilos y la API pasan por el propio sitio; en desarrollo, también el WebSocket del recargado.
    "connect-src": ["'self'", ...(development ? ["ws:"] : [])],
    // El worker de MapLibre se sirve desde /vendor; algunas versiones lo crean desde un blob.
    "worker-src": ["'self'", "blob:"],
    "child-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    // Nadie puede incrustar Velora en un iframe (clickjacking).
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(" ")}`)
    .join("; ");
}

export function securityHeaders(development: boolean): Header[] {
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(development) },
    // HTTPS siempre (el túnel de Cloudflare lo sirve); el navegador ignora este encabezado por http.
    { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    // Las URL de Velora pueden llevar ids de rodadas: no se mandan a otros sitios.
    { key: "Referrer-Policy", value: "same-origin" },
    // Velora no usa cámara, micrófono, ubicación ni pagos.
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  ];
}
