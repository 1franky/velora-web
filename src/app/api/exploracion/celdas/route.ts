import { type NextRequest } from "next/server";
import { api } from "@/lib/auth/session";
import { parseBbox } from "@/lib/explorer/heatmap";

const PRIVATE = { "Cache-Control": "private, no-store" };
const GRIDS = ["H3", "MX1KM"] as const;

/** Celdas visitadas dentro del recuadro visible (GeoJSON), ya recortadas por la privacidad (ADR-018). */
export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams;
  const grid = GRIDS.find((value) => value === search.get("grid"));
  const bbox = parseBbox(search.get("bbox"));
  if (!grid || !bbox) {
    return Response.json({ error: "invalid" }, { status: 400, headers: PRIVATE });
  }
  try {
    const { data, response } = await (
      await api()
    ).GET("/geo/exploration/cells", { params: { query: { grid, bbox: bbox.join(",") } } });
    if (data) {
      return Response.json(data, { headers: { ...PRIVATE, "Content-Type": "application/geo+json" } });
    }
    const status = response.status === 401 ? 401 : 502;
    return Response.json({ error: status === 401 ? "session" : "unavailable" }, { status, headers: PRIVATE });
  } catch {
    return Response.json({ error: "unavailable" }, { status: 502, headers: PRIVATE });
  }
}
