#!/usr/bin/env bash
# E2E contra la API real (PR 12). Levanta todo desechable y lo limpia al terminar, también si falla:
#   - PostgreSQL + PostGIS en un contenedor temporal (nunca la base local con tus datos),
#   - velora-api compilada desde VELORA_API_DIR (en CI, el commit fijado en velora.contractRef),
#   - un propietario con contraseña aleatoria que solo vive durante la prueba.
# Uso: pnpm e2e:real [argumentos de playwright]. Requiere Docker y JDK 25.
set -euo pipefail

WEB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_DIR="$(cd "${VELORA_API_DIR:-$WEB_DIR/../velora-api}" && pwd)"
DB_PORT="${E2E_DB_PORT:-55433}"
API_PORT="${E2E_API_PORT:-8091}"
WORK="$(mktemp -d)"
CONTAINER="velora-e2e-db-$$"
API_PID=""

cleanup() {
  local status=$?
  [[ -n "$API_PID" ]] && kill "$API_PID" 2>/dev/null || true
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  if [[ $status -ne 0 && -f "$WORK/api.log" ]]; then
    echo "--- Últimas líneas del log de la API ---"
    tail -n 60 "$WORK/api.log"
  fi
  rm -rf "$WORK"
  exit "$status"
}
trap cleanup EXIT

DB_PASSWORD="$(openssl rand -hex 16)"
export E2E_OWNER_EMAIL="propietario-e2e@example.com"
export E2E_OWNER_PASSWORD="$(openssl rand -hex 16)"

echo "Base de datos desechable en 127.0.0.1:${DB_PORT}…"
docker run -d --rm --name "$CONTAINER" \
  -e POSTGRES_DB=velora -e POSTGRES_USER=velora -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -p "127.0.0.1:$DB_PORT:5432" postgis/postgis:18-3.7 >/dev/null
until docker exec "$CONTAINER" pg_isready -U velora -d velora >/dev/null 2>&1; do sleep 1; done

echo "Compilando velora-api ($(git -C "$API_DIR" rev-parse --short HEAD))…"
(cd "$API_DIR" && ./gradlew bootJar -x test -q)
JAR="$(ls "$API_DIR"/build/libs/*.jar | grep -v -- '-plain.jar' | head -n 1)"

export VELORA_DB_URL="jdbc:postgresql://127.0.0.1:$DB_PORT/velora"
export VELORA_DB_USERNAME=velora
export VELORA_DB_PASSWORD="$DB_PASSWORD"
export VELORA_API_PORT="$API_PORT"
export VELORA_STORAGE_ORIGINALS_PATH="$WORK/originals"

echo "Creando el propietario de prueba…"
VELORA_OWNER_EMAIL="$E2E_OWNER_EMAIL" VELORA_OWNER_PASSWORD="$E2E_OWNER_PASSWORD" \
  java -jar "$JAR" --velora.bootstrap-owner --spring.main.web-application-type=none >"$WORK/bootstrap.log" 2>&1

echo "Arrancando la API en el puerto ${API_PORT}…"
java -jar "$JAR" >"$WORK/api.log" 2>&1 &
API_PID=$!
for _ in $(seq 1 120); do
  curl -sf "http://localhost:$API_PORT/actuator/health/readiness" >/dev/null && break
  kill -0 "$API_PID" 2>/dev/null || { echo "La API terminó antes de estar lista"; exit 1; }
  sleep 1
done
curl -sf "http://localhost:$API_PORT/actuator/health/readiness" >/dev/null

cd "$WEB_DIR"
VELORA_API_URL="http://localhost:$API_PORT" pnpm exec playwright test -c playwright.real.config.ts "$@"
