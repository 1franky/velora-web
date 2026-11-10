import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { type NextRequest } from "next/server";
import { apiBaseUrl, secureCookies } from "@/lib/auth/config";
import { cookieNames } from "@/lib/auth/cookies";
import { isValidAccessToken } from "@/lib/auth/verify";
import { basemapDir, parseRange, resolveBasemapFile } from "@/lib/basemap/files";

/**
 * Archivos del mapa base (ADR-015) servidos por Velora, con solicitudes por rangos para PMTiles. Solo con sesión
 * válida: son datos públicos de OpenStreetMap, pero el ancho de banda es nuestro. Ningún tercero recibe las zonas
 * consultadas.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/mapa/[...ruta]">) {
  const { ruta } = await params;
  const file = resolveBasemapFile(ruta, basemapDir());
  if (!file) {
    return new Response(null, { status: 404 });
  }
  const token = request.cookies.get(cookieNames(secureCookies()).access)?.value;
  if (!(await isValidAccessToken(token, apiBaseUrl()))) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const info = await stat(file.path).catch(() => null);
  if (!info?.isFile()) {
    return new Response(null, { status: 404 });
  }
  const etag = `"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`;
  const headers = new Headers({
    "Content-Type": file.contentType,
    "Cache-Control": `private, max-age=${file.maxAgeSeconds}`,
    "Accept-Ranges": "bytes",
    ETag: etag,
  });
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers });
  }

  // If-Range con otro ETag (el archivo cambió): se entrega completo en lugar de mezclar versiones.
  const ifRange = request.headers.get("if-range");
  const range = ifRange && ifRange !== etag ? undefined : parseRange(request.headers.get("range"), info.size);
  if (range === null) {
    headers.set("Content-Range", `bytes */${info.size}`);
    return new Response(null, { status: 416, headers });
  }
  const start = range?.start ?? 0;
  const end = range?.end ?? info.size - 1;
  headers.set("Content-Length", String(end - start + 1));
  if (range) {
    headers.set("Content-Range", `bytes ${start}-${end}/${info.size}`);
  }
  const body = Readable.toWeb(createReadStream(file.path, { start, end })) as ReadableStream<Uint8Array>;
  return new Response(body, { status: range ? 206 : 200, headers });
}
