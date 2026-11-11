import { type NextRequest } from "next/server";
import { parseFilters, toApiQuery } from "@/lib/activities/filters";
import { api } from "@/lib/auth/session";
import { validTile } from "@/lib/explorer/heatmap";

const PRIVATE = { "Cache-Control": "private, no-cache" };

/**
 * Tesela vectorial del mapa de calor (ADR-017). Pasa por Proxy (renueva la sesión) y reenvía el ETag: el navegador
 * revalida y recibe 304 si la tesela no cambió. Los filtros se validan con las mismas reglas que la lista.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/mapa-de-calor/[z]/[x]/[y]">) {
  const raw = await params;
  const [z, x, y] = [raw.z, raw.x, raw.y].map(Number);
  if (!validTile(z, x, y)) {
    return Response.json({ error: "invalid" }, { status: 400, headers: PRIVATE });
  }
  const search = request.nextUrl.searchParams;
  const { from, to, subType, bikeId } = toApiQuery(
    parseFilters({
      desde: search.get("from") ?? undefined,
      hasta: search.get("to") ?? undefined,
      tipo: search.get("subType") ?? undefined,
      bici: search.get("bikeId") ?? undefined,
    }),
  );
  const etag = request.headers.get("if-none-match");
  try {
    const { data, response } = await (
      await api()
    ).GET("/geo/heatmap/{z}/{x}/{y}", {
      params: { path: { z, x, y }, query: { from, to, subType, bikeId } },
      headers: etag ? { "If-None-Match": etag } : undefined,
      parseAs: "arrayBuffer",
    });
    if (response.status === 200 && data) {
      return new Response(data, {
        headers: {
          ...PRIVATE,
          "Content-Type": "application/vnd.mapbox-vector-tile",
          ETag: response.headers.get("etag") ?? "",
        },
      });
    }
    if (response.status === 204 || response.status === 304) {
      const headers: Record<string, string> = { ...PRIVATE };
      if (response.status === 304 && etag) headers.ETag = etag;
      return new Response(null, { status: response.status, headers });
    }
    const status = response.status === 401 ? 401 : 502;
    return Response.json({ error: status === 401 ? "session" : "unavailable" }, { status, headers: PRIVATE });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502, headers: PRIVATE });
  }
}
