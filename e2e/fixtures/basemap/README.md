# Mapa base mínimo para E2E

Recorte de prueba (zoom 0–3) generado con `pmtiles extract basemap/mexico.pmtiles mexico.pmtiles --maxzoom=3` a partir
del build `20261110` de [Protomaps](https://protomaps.com). Solo sirve para probar `/mapa/*` y el estilo sin descargar
el mapa completo (`pnpm basemap`).

- Datos: © [colaboradores de OpenStreetMap](https://www.openstreetmap.org/copyright), licencia ODbL.
- Fuentes Noto Sans (solo el rango 0-255): SIL Open Font License, ver `fonts/OFL.txt`.
- Iconos: derivados de [tangrams/icons](https://github.com/tangrams/icons) (MIT), vía `protomaps/basemaps-assets`.
