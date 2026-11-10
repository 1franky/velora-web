import { NextResponse, type NextRequest } from "next/server";
import { api } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIVATE = { "Cache-Control": "private, no-store" };

/** Recorrido simplificado para un zoom (GeoJSON). Pasa por Proxy; las coordenadas nunca se registran. */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/actividades/[id]/recorrido">) {
  const { id } = await params;
  const zoom = Number(request.nextUrl.searchParams.get("zoom") ?? 14);
  if (!UUID.test(id) || !Number.isInteger(zoom) || zoom < 0 || zoom > 22) {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: PRIVATE });
  }
  try {
    const { data, response } = await (
      await api()
    ).GET("/activities/{activityId}/track", {
      params: { path: { activityId: id }, query: { zoom } },
    });
    if (data) {
      return NextResponse.json(data, { headers: { ...PRIVATE, "Content-Type": "application/geo+json" } });
    }
    const status = response.status === 401 || response.status === 404 ? response.status : 502;
    return NextResponse.json(
      { error: status === 401 ? "session" : status === 404 ? "notFound" : "unavailable" },
      {
        status,
        headers: PRIVATE,
      },
    );
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502, headers: PRIVATE });
  }
}
