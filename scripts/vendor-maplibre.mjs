#!/usr/bin/env node
// Copia el Web Worker de MapLibre a public/vendor/maplibre-gl/<versión>/. MapLibre calcula la URL del worker con
// import.meta.url, que el empaquetador reescribe: sin esta copia el mapa no puede procesar teselas. La versión en la
// ruta evita cachés viejas al actualizar la librería. Forma parte de `pnpm dev` y `pnpm build`.
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("maplibre-gl/package.json");
const { version } = JSON.parse(await readFile(pkgPath, "utf8"));
const target = join("public", "vendor", "maplibre-gl", version);
await mkdir(target, { recursive: true });
await copyFile(join(dirname(pkgPath), "dist", "maplibre-gl-worker.mjs"), join(target, "maplibre-gl-worker.mjs"));
console.log(`Worker de MapLibre ${version} en ${target}`);
