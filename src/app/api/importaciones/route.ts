import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl, secureCookies } from "@/lib/auth/config";
import { forwardImport } from "@/lib/imports/upload";

/** Sube un archivo FIT, GPX o TCX. Fuera de Proxy (ver `forwardImport`); el cuerpo se reenvía como flujo. */
export async function POST(request: NextRequest) {
  const result = await forwardImport(request, {
    cookie: (name) => request.cookies.get(name)?.value,
    apiBaseUrl: apiBaseUrl(),
    secure: secureCookies(),
  });
  return NextResponse.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
