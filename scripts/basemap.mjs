#!/usr/bin/env node
// Descarga el mapa base de Velora (ADR-015): recorte de México del build público de Protomaps (OpenStreetMap, ODbL)
// más las fuentes y los iconos del estilo. Todo queda en `basemap/` (ignorado por Git) y lo sirve /mapa/*.
//
// Uso: pnpm basemap [--build=AAAAMMDD] [--maxzoom=14] [--out=basemap]
// Requiere la herramienta `pmtiles` (macOS: brew install pmtiles).
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const BUILDS = "https://build-metadata.protomaps.dev/builds.json";
const BUILD_URL = (key) => `https://build.protomaps.com/${key}`;
// Fuentes (SIL OFL) e iconos (derivados de tangrams/icons, MIT) fijados a un commit para que sea reproducible.
const ASSETS_COMMIT = "028c18f713baecad011301ff7a69acc39bcc2ae7";
const ASSETS_ZIP = `https://github.com/protomaps/basemaps-assets/archive/${ASSETS_COMMIT}.zip`;
const FONTS = ["Noto Sans Regular", "Noto Sans Medium", "Noto Sans Italic"];
const SPRITES = ["light", "dark"];

const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? "true"];
  }),
);
const maxzoom = Number(args.maxzoom ?? 14);
const out = resolve(args.out ?? "basemap");
const region = join(HERE, "basemap", "mexico.geojson");

function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { stdio: "inherit" });
  if (result.error?.code === "ENOENT") {
    throw new Error(`No se encontró \`${command}\`. En macOS: brew install ${command}`);
  }
  if (result.status !== 0) {
    throw new Error(`\`${command}\` terminó con código ${result.status}`);
  }
}

async function latestBuild() {
  const response = await fetch(BUILDS);
  if (!response.ok) throw new Error(`No se pudo leer la lista de builds de Protomaps (${response.status})`);
  const builds = await response.json();
  return builds.at(-1).key;
}

const build = args.build ? `${args.build}.pmtiles` : await latestBuild();
// Trabajo junto al destino: rename() no cruza sistemas de archivos.
await mkdir(dirname(out), { recursive: true });
const work = await mkdtemp(join(dirname(out), ".basemap-"));
try {
  console.log(`Recortando México de ${build} hasta zoom ${maxzoom}…`);
  run("pmtiles", [
    "extract",
    BUILD_URL(build),
    join(work, "mexico.pmtiles"),
    `--region=${region}`,
    `--maxzoom=${maxzoom}`,
  ]);

  console.log("Descargando fuentes e iconos…");
  const zip = await fetch(ASSETS_ZIP);
  if (!zip.ok) throw new Error(`No se pudieron descargar los recursos del estilo (${zip.status})`);
  await writeFile(join(work, "assets.zip"), Buffer.from(await zip.arrayBuffer()));
  run("unzip", ["-q", join(work, "assets.zip"), "-d", join(work, "assets")]);
  const assets = join(work, "assets", `basemaps-assets-${ASSETS_COMMIT}`);
  await mkdir(join(work, "out", "fonts"), { recursive: true });
  await mkdir(join(work, "out", "sprites"), { recursive: true });
  for (const font of FONTS) {
    await cp(join(assets, "fonts", font), join(work, "out", "fonts", font), { recursive: true });
  }
  await cp(join(assets, "fonts", "OFL.txt"), join(work, "out", "fonts", "OFL.txt"));
  for (const sprite of SPRITES) {
    for (const suffix of ["", "@2x"]) {
      for (const ext of ["json", "png"]) {
        await cp(
          join(assets, "sprites", "v4", `${sprite}${suffix}.${ext}`),
          join(work, "out", "sprites", `${sprite}${suffix}.${ext}`),
        );
      }
    }
  }
  await rename(join(work, "mexico.pmtiles"), join(work, "out", "mexico.pmtiles"));
  await writeFile(
    join(work, "out", "metadata.json"),
    `${JSON.stringify({ build, maxzoom, region: "scripts/basemap/mexico.geojson", assetsCommit: ASSETS_COMMIT, generatedAt: new Date().toISOString() }, null, 2)}\n`,
  );

  // Reemplazo al final: si algo falla, el mapa anterior sigue intacto.
  await rm(`${out}.anterior`, { recursive: true, force: true });
  await rename(out, `${out}.anterior`).catch(() => undefined);
  await rename(join(work, "out"), out);
  await rm(`${out}.anterior`, { recursive: true, force: true });
  console.log(`Listo: ${out}`);
} finally {
  await rm(work, { recursive: true, force: true });
}
