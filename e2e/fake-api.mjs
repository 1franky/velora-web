// API falsa para E2E de autenticación: imita /auth/* y /me del contrato con rotación estricta de refresh tokens
// (ADR-010). La API real se usará en E2E completos (Fase 3, PR 7). Solo para pruebas: nunca en producción.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.FAKE_API_PORT ?? 3101);
// 32 s → la cookie del BFF dura 2 s (margen de 30 s), para probar la renovación en Proxy sin esperar 15 min.
const ACCESS_TTL = Number(process.env.FAKE_ACCESS_TTL ?? 32);
const OWNER = { email: "propietario@example.com", password: "contraseña-de-prueba" };

let state;
function reset() {
  state = { access: new Map(), refresh: new Map(), revoked: new Set(), refreshCalls: 0, logins: 0 };
}
reset();

function issue(family) {
  const accessToken = randomUUID();
  const refreshToken = randomUUID();
  state.access.set(accessToken, { family, expiresAt: Date.now() + ACCESS_TTL * 1000 });
  state.refresh.set(refreshToken, { family, used: false });
  return {
    tokenType: "Bearer",
    accessToken,
    accessTokenExpiresIn: ACCESS_TTL,
    refreshToken,
    refreshTokenExpiresIn: 3600,
  };
}

function send(res, status, body, headers = {}) {
  const problem = status >= 400;
  res.writeHead(status, { "Content-Type": problem ? "application/problem+json" : "application/json", ...headers });
  res.end(body === undefined ? undefined : JSON.stringify(body));
}

const unauthorized = (res, detail) => send(res, 401, { title: "No autenticado", status: 401, detail });

createServer(async (req, res) => {
  let raw = "";
  for await (const chunk of req) raw += chunk;
  const body = raw ? JSON.parse(raw) : {};
  const route = `${req.method} ${req.url}`;

  if (route === "POST /__reset") return (reset(), send(res, 204));
  if (route === "GET /__stats") return send(res, 200, { refreshCalls: state.refreshCalls, logins: state.logins });

  if (route === "POST /api/v1/auth/login") {
    if (body.password === "bloqueado") {
      return send(res, 429, { title: "Demasiados intentos", status: 429 }, { "Retry-After": "90" });
    }
    if (body.email?.toLowerCase() !== OWNER.email || body.password !== OWNER.password) {
      return unauthorized(res, "Correo o contraseña incorrectos.");
    }
    state.logins++;
    return send(res, 200, issue(randomUUID()));
  }
  if (route === "POST /api/v1/auth/refresh") {
    state.refreshCalls++;
    const token = state.refresh.get(body.refreshToken);
    if (!token || state.revoked.has(token.family)) return unauthorized(res, "Sesión no válida.");
    if (token.used) {
      state.revoked.add(token.family); // reutilización: posible robo → se revoca la sesión entera
      return unauthorized(res, "Sesión no válida.");
    }
    token.used = true;
    return send(res, 200, issue(token.family));
  }
  if (route === "POST /api/v1/auth/logout") {
    const token = state.refresh.get(body.refreshToken);
    if (token) state.revoked.add(token.family);
    return send(res, 204);
  }
  if (route === "GET /api/v1/me") {
    const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "");
    const session = state.access.get(bearer);
    if (!session || session.expiresAt < Date.now() || state.revoked.has(session.family)) {
      return unauthorized(res, "Inicia sesión para continuar.");
    }
    return send(res, 200, {
      id: "6f1c3c62-5a0e-4a4e-9a51-0b2c8f8d2f10",
      email: OWNER.email,
      preferences: { locale: "es-MX", timeZone: "America/Mexico_City", distanceUnit: "km", elevationUnit: "m" },
    });
  }
  send(res, 404, { title: "No encontrado", status: 404 });
}).listen(PORT, () => console.log(`API falsa en http://localhost:${PORT}`));
