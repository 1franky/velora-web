import { accessToken } from "@/lib/auth/session";

/**
 * Comprobación ligera antes de subir un archivo: al pasar por Proxy, este deja un access token vigente (lo renueva
 * si caducó), porque la ruta de subida queda fuera de Proxy y no renueva tokens.
 */
export async function GET() {
  const status = (await accessToken()) ? 204 : 401;
  return new Response(null, { status, headers: { "Cache-Control": "no-store" } });
}
