import { NextResponse } from "next/server";
import { api } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRIVATE = { "Cache-Control": "private, no-store" };

/** Caminos nuevos de una actividad (ADR-019), ya recortados por la privacidad. Pasa por Proxy. */
export async function GET(_request: Request, { params }: RouteContext<"/api/actividades/[id]/caminos-nuevos">) {
  const { id } = await params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "invalid" }, { status: 400, headers: PRIVATE });
  }
  try {
    const { data, response } = await (await api()).GET("/geo/new-territory", { params: { query: { activityId: id } } });
    if (data) return NextResponse.json(data, { headers: PRIVATE });
    const status = response.status === 401 ? 401 : response.status === 404 ? 404 : 502;
    const error = status === 401 ? "session" : status === 404 ? "notFound" : "unavailable";
    return NextResponse.json({ error }, { status, headers: PRIVATE });
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502, headers: PRIVATE });
  }
}
