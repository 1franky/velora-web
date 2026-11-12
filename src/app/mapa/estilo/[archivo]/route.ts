import { type NextRequest } from "next/server";
import { apiBaseUrl, secureCookies } from "@/lib/auth/config";
import { cookieNames } from "@/lib/auth/cookies";
import { isValidAccessToken } from "@/lib/auth/verify";
import { basemapAvailable } from "@/lib/basemap/available";
import { publicOrigin, requestAccessToken } from "@/lib/basemap/request";
import { basemapStyle, type MapTheme } from "@/lib/basemap/style";

/** Con extensión, como los demás archivos del mapa: así no pasa por Proxy (que redirige al login sin cookie). */
const THEMES: Record<string, MapTheme> = { "claro.json": "light", "oscuro.json": "dark" };

/**
 * Estilo de MapLibre del mapa base para la app de Android (ADR-024): el mismo que arma la web en el navegador, con
 * URL absolutas a este sitio. Sin el recorte instalado, solo un fondo liso (como en la web).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/mapa/estilo/[archivo]">) {
  const { archivo } = await params;
  const theme = Object.hasOwn(THEMES, archivo) ? THEMES[archivo] : undefined;
  if (!theme) {
    return new Response(null, { status: 404 });
  }
  const token = requestAccessToken(request.headers, request.cookies.get(cookieNames(secureCookies()).access)?.value);
  if (!(await isValidAccessToken(token, apiBaseUrl()))) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const style = basemapStyle(theme, publicOrigin(request.headers, request.nextUrl.origin), await basemapAvailable());
  return Response.json(style, { headers: { "Cache-Control": "private, max-age=300" } });
}
