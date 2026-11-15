import type { NextRequest } from "next/server";
import { createApiClient } from "@/lib/api/client";
import { apiBaseUrl } from "@/lib/auth/config";
import { accessToken } from "@/lib/auth/session";
import { redirectTo } from "@/lib/http/redirect";
import { callbackProblem, connectionNotice, type StravaNotice } from "@/lib/strava/connection";

/**
 * Retorno de la autorización de Strava (ADR-030). Strava redirige aquí con `code`, `state` y `scope` (o `error` si
 * el usuario no autorizó); la web los pasa a la API, que valida el estado y guarda los tokens. Nunca se muestran
 * ni se registran.
 */
export async function GET(request: NextRequest) {
  const back = (notice: StravaNotice) => redirectTo(`/configuracion?strava=${notice}#strava`);
  const params = request.nextUrl.searchParams;
  const callback = {
    code: params.get("code"),
    state: params.get("state"),
    scope: params.get("scope"),
    error: params.get("error"),
  };
  const problem = callbackProblem(callback);
  if (problem) return back(problem);
  try {
    const { response } = await createApiClient(apiBaseUrl(), await accessToken()).POST(
      "/integrations/strava/connection",
      { body: { code: callback.code!, state: callback.state!, scope: callback.scope! } },
    );
    return back(connectionNotice(response.status));
  } catch {
    return back("error");
  }
}
