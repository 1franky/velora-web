// Genera src/lib/api/schema.d.ts desde el contrato OpenAPI de velora-api (ADR-011).
//
//   pnpm api:types           desde el commit fijado en package.json (velora.contractRef)
//   pnpm api:types --local   desde ../velora-api/openapi/openapi-v1.yaml (cambios aún no integrados)
//   pnpm api:check           falla si el archivo versionado no coincide con el commit fijado (CI)
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const root = new URL("../", import.meta.url);
const target = new URL("src/lib/api/schema.d.ts", root);
const args = new Set(process.argv.slice(2));
const pkg = JSON.parse(await readFile(new URL("package.json", root), "utf8"));
const ref = pkg.velora?.contractRef;
if (!/^[0-9a-f]{40}$/.test(ref ?? "")) {
  throw new Error("package.json debe fijar velora.contractRef a un commit completo de velora-api");
}

let source;
let origin;
if (args.has("--local")) {
  const path = fileURLToPath(new URL("../velora-api/openapi/openapi-v1.yaml", root));
  source = await readFile(path, "utf8");
  origin = "copia local de velora-api (sin fijar)";
} else {
  const url = `https://raw.githubusercontent.com/1franky/velora-api/${ref}/openapi/openapi-v1.yaml`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo descargar el contrato (${response.status}): ${url}`);
  }
  source = await response.text();
  origin = `velora-api@${ref}`;
}

const header = `// Generado por scripts/api-types.mjs desde ${origin}. No editar a mano.\n\n`;
const generated = header + astToString(await openapiTS(source));

if (args.has("--check")) {
  const current = await readFile(target, "utf8").catch(() => "");
  if (current !== generated) {
    console.error("src/lib/api/schema.d.ts no coincide con el contrato fijado. Ejecuta: pnpm api:types");
    process.exit(1);
  }
  console.log(`Tipos de la API al día con ${origin}.`);
} else {
  await writeFile(target, generated);
  console.log(`Tipos generados desde ${origin}.`);
}
