import { NextResponse } from "next/server";
import { api } from "@/lib/auth/session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_STORE = { "Cache-Control": "no-store" };

/** Estado de un trabajo de importación. Pasa por Proxy, que renueva el access token si hace falta. */
export async function GET(_request: Request, { params }: RouteContext<"/api/importaciones/[jobId]">) {
  const { jobId } = await params;
  if (!UUID.test(jobId)) {
    return NextResponse.json({ error: "notFound" }, { status: 404, headers: NO_STORE });
  }
  try {
    const { data, response } = await (await api()).GET("/imports/{jobId}", { params: { path: { jobId } } });
    if (data) {
      return NextResponse.json(data, { headers: NO_STORE });
    }
    const status = response.status === 401 || response.status === 404 ? response.status : 502;
    return NextResponse.json(
      { error: status === 401 ? "session" : status === 404 ? "notFound" : "unavailable" },
      {
        status,
        headers: NO_STORE,
      },
    );
  } catch {
    return NextResponse.json({ error: "unavailable" }, { status: 502, headers: NO_STORE });
  }
}
