/**
 * Redirección 303 a una ruta de la propia web, con `Location` relativo. Detrás del proxy, `request.url` de un route
 * handler trae el host interno del contenedor (`localhost:3000`), así que una URL absoluta armada con él manda al
 * navegador a un servidor que no existe; la ruta relativa la resuelve el navegador contra el dominio público.
 */
export function redirectTo(path: string): Response {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error(`Ruta de redirección no relativa: ${path}`);
  }
  return new Response(null, { status: 303, headers: { Location: path } });
}
