import { NextResponse, type NextRequest } from "next/server";
import { apiBaseUrl, secureCookies } from "@/lib/auth/config";
import { cookieNames, expiredCookieOptions, safeNextPath, tokenCookies } from "@/lib/auth/cookies";
import { refreshTokens } from "@/lib/auth/refresh";

/**
 * Comprobación optimista de sesión y renovación de tokens (ADR-014). Solo lee cookies y, cuando el access token ya
 * caducó, renueva el par con un único refresh compartido. La autorización real la hace la API en cada llamada.
 *
 * Las cookies no pueden escribirse durante el render; por eso la renovación ocurre aquí, antes, y el token nuevo se
 * reenvía a la propia solicitud para que la página ya lo use.
 */
export async function proxy(request: NextRequest) {
  const secure = secureCookies();
  const names = cookieNames(secure);
  const { pathname, search } = request.nextUrl;
  const isLogin = pathname === "/login";
  const access = request.cookies.get(names.access)?.value;
  const refresh = request.cookies.get(names.refresh)?.value;

  if (access) {
    return isLogin ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  }

  if (refresh) {
    const result = await refreshTokens(refresh, apiBaseUrl());
    if (result.ok) {
      const cookies = tokenCookies(result.pair, secure);
      for (const cookie of cookies) {
        request.cookies.set(cookie.name, cookie.value);
      }
      const response = isLogin
        ? NextResponse.redirect(new URL("/", request.url))
        : NextResponse.next({ request: { headers: new Headers(request.headers) } });
      for (const cookie of cookies) {
        response.cookies.set(cookie.name, cookie.value, cookie.options);
      }
      return response;
    }
    if (result.reason === "unavailable") {
      // La API no respondió: no se pierde la sesión; la página mostrará el error y el siguiente intento reintenta.
      return NextResponse.next();
    }
  }

  if (isLogin) {
    return clearSession(NextResponse.next(), names, secure, Boolean(refresh));
  }
  if (pathname.startsWith("/api/")) {
    // Las rutas de datos responden 401 en JSON: una redirección al login llegaría a fetch como HTML con 200.
    const unauthorized = NextResponse.json({ error: "session" }, { status: 401 });
    return clearSession(unauthorized, names, secure, Boolean(refresh));
  }
  const login = new URL("/login", request.url);
  const next = safeNextPath(pathname + search);
  if (next !== "/") {
    login.searchParams.set("next", next);
  }
  return clearSession(NextResponse.redirect(login), names, secure, Boolean(refresh));
}

function clearSession(
  response: NextResponse,
  names: ReturnType<typeof cookieNames>,
  secure: boolean,
  hadRefresh: boolean,
) {
  if (hadRefresh) {
    response.cookies.set(names.access, "", expiredCookieOptions(secure));
    response.cookies.set(names.refresh, "", expiredCookieOptions(secure));
  }
  return response;
}

export const config = {
  // Todo salvo recursos estáticos de Next, archivos con extensión (favicon, imágenes, teselas) y la subida de
  // archivos: Proxy copia el cuerpo en memoria y lo trunca a 10 MB (ver src/lib/imports/upload.ts).
  matcher: ["/((?!_next/static|_next/image|api/importaciones$|.*\\.[a-zA-Z0-9]+$).*)"],
};
