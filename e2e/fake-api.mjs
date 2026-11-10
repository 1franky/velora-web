// API falsa para E2E: imita /auth/* y /me con rotación estricta de refresh tokens (ADR-010), más actividades,
// bicicletas e importaciones con datos sintéticos (sin coordenadas ni archivos reales). La API real se usará en E2E
// completos (Fase 3). Solo para pruebas: nunca en producción.
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.FAKE_API_PORT ?? 3101);
// 32 s → la cookie del BFF dura 2 s (margen de 30 s), para probar la renovación en Proxy sin esperar 15 min.
const ACCESS_TTL = Number(process.env.FAKE_ACCESS_TTL ?? 32);
const OWNER = { email: "propietario@example.com", password: "contraseña-de-prueba" };

const BIKE = {
  id: "b1a1c0de-0000-4000-8000-000000000001",
  name: "Gravel de diario",
  bikeType: "GRAVEL",
  brand: null,
  model: null,
  weightKg: null,
  active: true,
  createdAt: "2026-01-01T12:00:00Z",
};
const SUB_TYPES = ["GRAVEL", "ROAD", "MOUNTAIN_BIKE", "INDOOR", "GRAVEL", "ROAD"];
const ACTIVITY_COUNT = 30;

/** 30 rodadas sintéticas, una cada dos días hacia atrás desde el 8/11/2026; la primera es la más reciente. */
function seedActivities() {
  return Array.from({ length: ACTIVITY_COUNT }, (_, i) => {
    const date = new Date(Date.UTC(2026, 10, 8 - i * 2));
    const subType = SUB_TYPES[i % SUB_TYPES.length];
    const indoor = subType === "INDOOR";
    const distance = indoor ? null : 15_000 + ((i * 7_919) % 75_000);
    const moving = 3_600 + ((i * 611) % 7_200);
    return {
      id: `a0000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
      title: `Rodada ${ACTIVITY_COUNT - i}`,
      startedAt: `${date.toISOString().slice(0, 10)}T13:00:00Z`,
      localStartDate: date.toISOString().slice(0, 10),
      subType,
      distanceMeters: distance,
      movingTimeSeconds: moving,
      elapsedTimeSeconds: moving + 600,
      elevationGainMeters: indoor ? null : 120 + ((i * 97) % 1_400),
      averageSpeedMps: distance === null ? null : distance / moving,
      bikeId: subType === "GRAVEL" ? BIKE.id : null,
    };
  });
}

function detail(summary) {
  return {
    ...summary,
    timeZone: "America/Mexico_City",
    sourceType: "FIT",
    deviceId: null,
    elevationLossMeters: summary.elevationGainMeters,
    maxSpeedMps: summary.averageSpeedMps === null ? null : summary.averageSpeedMps * 1.8,
    averageHeartRateBpm: 142,
    maxHeartRateBpm: 176,
    averagePowerWatts: null,
    maxPowerWatts: null,
    averageCadenceRpm: 84,
    metricsProvenance: { distanceMeters: "DEVICE_REPORTED", movingTimeSeconds: "DERIVED" },
    hasTrack: summary.subType !== "INDOOR",
    streamTypes: ["TIME", "DISTANCE"],
    lapCount: 1,
    originalFile: { format: "FIT", sizeBytes: 182_345, importedAt: "2026-11-10T03:30:00Z" },
  };
}

let state;
function reset() {
  state = {
    access: new Map(),
    refresh: new Map(),
    revoked: new Set(),
    refreshCalls: 0,
    logins: 0,
    activities: seedActivities(),
    jobs: new Map(),
    lastUploadBytes: 0,
  };
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

function authorized(req) {
  const bearer = (req.headers.authorization ?? "").replace(/^Bearer /, "");
  const session = state.access.get(bearer);
  return Boolean(session && session.expiresAt >= Date.now() && !state.revoked.has(session.family));
}

function listActivities(query) {
  const min = query.get("minDistanceM");
  const max = query.get("maxDistanceM");
  const matches = state.activities.filter(
    (a) =>
      (!query.get("from") || a.localStartDate >= query.get("from")) &&
      (!query.get("to") || a.localStartDate <= query.get("to")) &&
      (!query.get("subType") || a.subType === query.get("subType")) &&
      (!query.get("bikeId") || a.bikeId === query.get("bikeId")) &&
      (min === null || (a.distanceMeters !== null && a.distanceMeters >= Number(min))) &&
      (max === null || (a.distanceMeters !== null && a.distanceMeters <= Number(max))),
  );
  const offset = query.get("cursor") ? Number(Buffer.from(query.get("cursor"), "base64url").toString()) : 0;
  const limit = Number(query.get("limit") ?? 25);
  const items = matches.slice(offset, offset + limit);
  const next = offset + limit < matches.length ? Buffer.from(String(offset + limit)).toString("base64url") : null;
  return { items, nextCursor: next };
}

/** El resultado depende del nombre del archivo sintético: así cada E2E elige su escenario. */
function startImport(raw) {
  const name = /filename="([^"]+)"/.exec(raw.toString("latin1"))?.[1] ?? "archivo.fit";
  const jobId = randomUUID();
  let result;
  if (name.includes("duplicada")) {
    result = { status: "DUPLICATE", activityId: seedActivities()[0].id };
  } else if (name.includes("rota")) {
    result = { status: "REJECTED", errorCode: "MALFORMED_FILE", errorDetail: "El archivo está dañado." };
  } else {
    const activity = {
      ...seedActivities()[0],
      id: randomUUID(),
      title: `Importada ${name}`,
      localStartDate: "2026-11-09",
      startedAt: "2026-11-09T13:00:00Z",
    };
    state.activities.unshift(activity);
    const similar = name.includes("parecida");
    result = {
      status: "COMPLETED",
      activityId: activity.id,
      warnings: similar
        ? [
            { code: "GPS_JUMPS", affectedCount: 3 },
            { code: "POSSIBLE_DUPLICATE", affectedCount: 1 },
          ]
        : [],
      possibleDuplicateActivityIds: similar ? [state.activities[1].id] : [],
    };
  }
  state.jobs.set(jobId, { polls: 0, result });
  return jobId;
}

function job(jobId) {
  const entry = state.jobs.get(jobId);
  if (!entry) return null;
  entry.polls++;
  const base = {
    jobId,
    kind: "IMPORT",
    activityId: null,
    errorCode: null,
    errorDetail: null,
    warnings: [],
    possibleDuplicateActivityIds: [],
  };
  return entry.polls < 2 ? { ...base, status: "PROCESSING" } : { ...base, ...entry.result };
}

createServer(async (req, res) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  const isJson = (req.headers["content-type"] ?? "").includes("application/json");
  const body = isJson && raw.length ? JSON.parse(raw.toString("utf8")) : {};
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const route = `${req.method} ${url.pathname}`;

  if (route === "POST /__reset") return (reset(), send(res, 204));
  if (route === "POST /__empty") return ((state.activities = []), send(res, 204));
  if (route === "GET /__stats") {
    return send(res, 200, {
      refreshCalls: state.refreshCalls,
      logins: state.logins,
      lastUploadBytes: state.lastUploadBytes,
    });
  }

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
  if (url.pathname.startsWith("/api/v1/") && !authorized(req)) {
    return unauthorized(res, "Inicia sesión para continuar.");
  }
  if (route === "GET /api/v1/activities") return send(res, 200, listActivities(url.searchParams));
  if (route === "GET /api/v1/bikes") return send(res, 200, { items: [BIKE] });
  if (route === "POST /api/v1/activities/imports") {
    state.lastUploadBytes = raw.length;
    const jobId = startImport(raw);
    return send(res, 202, { jobId, status: "QUEUED", statusUrl: `/api/v1/imports/${jobId}` });
  }
  const jobMatch = /^GET \/api\/v1\/imports\/([\w-]+)$/.exec(route);
  if (jobMatch) {
    const found = job(jobMatch[1]);
    return found ? send(res, 200, found) : send(res, 404, { title: "No encontrado", status: 404 });
  }
  const activityMatch = /^GET \/api\/v1\/activities\/([\w-]+)$/.exec(route);
  if (activityMatch) {
    const found = state.activities.find((a) => a.id === activityMatch[1]);
    return found
      ? send(res, 200, detail(found))
      : send(res, 404, { title: "No encontrado", status: 404, detail: "La actividad no existe." });
  }
  if (route === "GET /api/v1/me") {
    return send(res, 200, {
      id: "6f1c3c62-5a0e-4a4e-9a51-0b2c8f8d2f10",
      email: OWNER.email,
      preferences: { locale: "es-MX", timeZone: "America/Mexico_City", distanceUnit: "km", elevationUnit: "m" },
    });
  }
  send(res, 404, { title: "No encontrado", status: 404 });
}).listen(PORT, () => console.log(`API falsa en http://localhost:${PORT}`));
