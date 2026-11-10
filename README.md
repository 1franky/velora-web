# velora-web

Aplicación web adaptable de **Velora**, plataforma personal de analítica de ciclismo (ruta y MTB).

> Nombre provisional. Estado: Fase 3 — scaffold.

## Stack previsto

- Next.js + TypeScript.
- MapLibre GL JS para mapas.
- Apache ECharts para gráficas.
- Interfaz en español de México (`es-MX`) mediante i18n.

Las versiones exactas se validarán al crear el scaffold (ver roadmap, Fase 0).

## Desarrollo

Requisitos: Node 26 LTS (`.nvmrc`) y pnpm 12. Con [fnm](https://github.com/Schniz/fnm): `fnm use` dentro de la carpeta.

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

| Comando                                              | Qué hace                                                                                                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck` / `pnpm format:check` | Calidad (lint sin avisos, tipos, formato)                                                                                                           |
| `pnpm test`                                          | Pruebas unitarias (Vitest)                                                                                                                          |
| `pnpm e2e`                                           | Build de producción + pruebas E2E con Playwright, incluida accesibilidad (axe, WCAG A/AA)                                                           |
| `pnpm api:types`                                     | Regenera `src/lib/api/schema.d.ts` desde el contrato de `velora-api` fijado en `package.json` (`velora.contractRef`); `--local` usa `../velora-api` |
| `pnpm api:check`                                     | Verifica que los tipos coinciden con el contrato fijado (CI)                                                                                        |

**Variables de entorno** (ver `.env.example`): `VELORA_API_URL`, URL de `velora-api` que solo conoce el servidor de Next.js.

**Autenticación (ADR-014):** el servidor de Next.js es el único cliente de la API. Login y logout son server actions; los tokens viven en cookies `HttpOnly` (`__Host-` y `Secure` en producción) y el navegador nunca los ve. `src/proxy.ts` redirige al login sin sesión y renueva el access token antes de que caduque con un único refresh compartido entre solicitudes simultáneas (la API revoca la sesión si un refresh token se reutiliza). Las pruebas E2E usan una API falsa (`e2e/fake-api.mjs`) con la misma rotación estricta.

**Importación de archivos:** el navegador sube cada archivo a `POST /api/importaciones`, que lo reenvía como flujo a `velora-api` sin cargarlo en memoria. Esa ruta queda fuera de Proxy (Proxy copia el cuerpo y lo trunca en silencio a 10 MB) y comprueba el origen, porque un route handler no tiene la protección CSRF de las server actions. No renueva tokens: antes de subir, el navegador llama a `/api/sesion`, que pasa por Proxy, para que haya un solo punto de renovación. El estado del trabajo se consulta en `/api/importaciones/{jobId}`.

**Cadena de suministro:** `pnpm-workspace.yaml` exige que las dependencias tengan al menos 3 días publicadas y bloquea scripts de instalación salvo los aprobados explícitamente.

**Textos:** todo texto visible vive en `messages/es-MX.json` (next-intl); los formatos de números, unidades, duraciones y fechas usan `Intl` con es-MX (`src/lib/format`).

## Diseño

- **Tokens** en `src/app/globals.css` (Tailwind 4, `@theme`): niebla `#eef1f3` y superficies blancas, tinta `#1c2430`, acento cempasúchil `#9a4a06` para texto y botones (6.3:1 con blanco) y `#c76a0e` solo para marcas no textuales. Tema oscuro equivalente con acento `#f2a03d`.
- **Tema**: claro, oscuro o según el dispositivo; se guarda solo en el navegador (`velora-tema`) y un script en línea lo aplica antes del primer pintado.
- **Tipografía**: Barlow y Barlow Semi Condensed, autoalojadas con `next/font`; cifras tabulares con la clase `cifras`.
- **Estructura**: riel lateral en escritorio y barra inferior con "Más" en móvil; la sección activa se marca con una franja de carril.
- **Accesibilidad**: enlace para saltar al contenido, foco visible, `prefers-reduced-motion` respetado y pruebas axe (WCAG 2.1 AA) en claro y oscuro.

## Repositorios relacionados

- `velora-api` — backend (Java + Spring Boot).
- `velora-android` — aplicación Android (Kotlin + Jetpack Compose).

## Licencia

[Apache-2.0](LICENSE).
