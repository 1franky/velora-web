# Instrucciones para agentes — velora-web

Repositorio de la aplicación web (Next.js + TypeScript).

## Reglas específicas

- Consume la API únicamente según `openapi-v1.yaml`; no inventes endpoints ni campos.
- Todos los textos de interfaz pasan por i18n (`es-MX` inicial).
- No publiques mapas ni tracks privados; respeta la atribución del proveedor de tiles.
- Considera accesibilidad y diseño adaptable desde el inicio.

## Reglas comunes (resumen de `velora-project-kit/AGENTS.md`)

- Lee la especificación en `velora-project-kit` (`README.md`, `AGENTS.md`, `docs/`) antes de cambiar código.
- No inventes requisitos, endpoints, campos ni dependencias; el contrato HTTP es `contracts/openapi-v1.yaml`.
- Todo texto visible al usuario en español de México (`es-MX`), mediante el sistema de i18n; nunca hardcodeado.
- Zona horaria inicial `America/Mexico_City`, configurable. Fechas visibles `dd/MM/yyyy`; instantes en UTC.
- Unidades por defecto: km, m, km/h, °C.
- No registres tokens, contraseñas, archivos FIT/GPX/TCX ni coordenadas privadas en logs.
- No incluyas secretos en código, fixtures ni capturas. Este repositorio es **público**.
- El conector Strava permanece deshabilitado por defecto; ver `docs/09-strava-legal-and-data-governance.md`.
- Cambios pequeños, tipados y con pruebas. No afirmes que una prueba pasó si no la ejecutaste.
- Nunca hagas `git push` a ramas protegidas, publiques secretos ni despliegues sin autorización explícita.
