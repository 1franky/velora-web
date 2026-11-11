# Imagen de despliegue de velora-web (VPS). El desarrollo local sigue siendo `pnpm dev`; esta imagen solo la
# usa `compose.deploy.yaml`.
#
# VELORA_API_URL es de runtime (la lee el servidor de Next.js, ADR-014), no se incrusta en el build.

ARG PNPM_VERSION=12.18.0

# --- Etapa de build ---
FROM node:26-alpine AS build
ARG PNPM_VERSION
# Node 25+ ya no incluye corepack: se instala la versión exacta de pnpm de "packageManager".
RUN npm install -g pnpm@${PNPM_VERSION}
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc* ./
RUN pnpm install --frozen-lockfile

COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm build \
    && pnpm prune --prod --config.ignore-scripts=true

# --- Etapa de ejecución ---
FROM node:26-alpine
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    VELORA_BASEMAP_DIR=/app/basemap

RUN addgroup -S velora && adduser -S -G velora velora \
    && mkdir -p /app/basemap && chown velora:velora /app/basemap

COPY --from=build --chown=velora:velora /workspace/package.json ./
COPY --from=build --chown=velora:velora /workspace/next.config.ts ./
COPY --from=build --chown=velora:velora /workspace/node_modules ./node_modules
COPY --from=build --chown=velora:velora /workspace/.next ./.next
COPY --from=build --chown=velora:velora /workspace/public ./public
COPY --from=build --chown=velora:velora /workspace/messages ./messages
COPY --from=build --chown=velora:velora /workspace/src/i18n ./src/i18n

USER velora
EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
