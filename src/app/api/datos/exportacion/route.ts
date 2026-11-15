import { createApiClient } from "@/lib/api/client";
import { exportFailure } from "@/lib/account/export";
import { apiBaseUrl } from "@/lib/auth/config";
import { accessToken } from "@/lib/auth/session";
import { redirectTo } from "@/lib/http/redirect";

/**
 * Descarga de la exportación completa (ADR-028). Reenvía el ZIP de la API en streaming, sin guardarlo ni leerlo.
 * Se abre con un enlace normal: si falla, vuelve a Configuración con el motivo en `?datos=`.
 */
export async function GET() {
  const back = (reason: string) => redirectTo(`/configuracion?datos=${reason}#tus-datos`);
  try {
    const { data, response } = await createApiClient(apiBaseUrl(), await accessToken()).GET("/me/export", {
      parseAs: "stream",
    });
    if (!data) return back(exportFailure(response.status));
    return new Response(data, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": response.headers.get("Content-Disposition") ?? 'attachment; filename="velora.zip"',
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return back("error");
  }
}
