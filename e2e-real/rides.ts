/**
 * Rodadas sintéticas para las E2E reales: el mismo recorrido inventado en GPX y TCX (como cuando un dispositivo
 * exporta en varios formatos). Coordenadas ficticias en línea recta con un vaivén; nunca datos del usuario.
 */
export type Ride = { start: Date; points: number; seconds: number };

const ORIGIN = { lat: 20.5, lon: -100.5 };

const position = (i: number) => ({
  lat: ORIGIN.lat + i * 0.00004,
  lon: ORIGIN.lon + i * 0.00004 + Math.sin(i / 60) * 0.0004,
});

/** Distancia entre dos posiciones (haversine), para que el TCX reporte lo mismo que se calcula del GPX. */
function meters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_008.8 * Math.asin(Math.sqrt(h));
}

const cumulative: number[] = [0];
function distanceAt(i: number) {
  for (let k = cumulative.length; k <= i; k++) cumulative[k] = cumulative[k - 1] + meters(position(k - 1), position(k));
  return cumulative[i];
}

function point(i: number) {
  // ~6 m por segundo hacia el noreste con un vaivén suave: velocidad de rodada sin saltos de GPS.
  return {
    ...position(i),
    ele: 1900 + 40 * Math.sin(i / 150),
    hr: 125 + Math.round(20 * Math.sin(i / 200)),
    cadence: 82 + (i % 5),
    distance: distanceAt(i),
  };
}

const iso = (ride: Ride, i: number) => new Date(ride.start.getTime() + i * ride.seconds * 1000).toISOString();

export function gpx(ride: Ride, name = "Rodada sintética"): string {
  const points = Array.from({ length: ride.points }, (_, i) => {
    const p = point(i);
    return `<trkpt lat="${p.lat.toFixed(7)}" lon="${p.lon.toFixed(7)}"><ele>${p.ele.toFixed(1)}</ele><time>${iso(ride, i)}</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>${p.hr}</gpxtpx:hr><gpxtpx:cad>${p.cadence}</gpxtpx:cad></gpxtpx:TrackPointExtension></extensions></trkpt>`;
  }).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="velora-e2e" xmlns="http://www.topografix.com/GPX/1/1" xmlns:gpxtpx="http://www.garmin.com/xmlschemas/TrackPointExtension/v1">
<metadata><time>${iso(ride, 0)}</time></metadata>
<trk><name>${name}</name><type>cycling</type><trkseg>
${points}
</trkseg></trk>
</gpx>
`;
}

export function tcx(ride: Ride): string {
  const points = Array.from({ length: ride.points }, (_, i) => {
    const p = point(i);
    return `<Trackpoint><Time>${iso(ride, i)}</Time><Position><LatitudeDegrees>${p.lat.toFixed(7)}</LatitudeDegrees><LongitudeDegrees>${p.lon.toFixed(7)}</LongitudeDegrees></Position><AltitudeMeters>${p.ele.toFixed(1)}</AltitudeMeters><DistanceMeters>${p.distance.toFixed(1)}</DistanceMeters><HeartRateBpm><Value>${p.hr}</Value></HeartRateBpm><Cadence>${p.cadence}</Cadence></Trackpoint>`;
  }).join("\n");
  const total = (ride.points - 1) * ride.seconds;
  return `<?xml version="1.0" encoding="UTF-8"?>
<TrainingCenterDatabase xmlns="http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2">
<Activities><Activity Sport="Biking"><Id>${iso(ride, 0)}</Id>
<Lap StartTime="${iso(ride, 0)}"><TotalTimeSeconds>${total}</TotalTimeSeconds><DistanceMeters>${point(ride.points - 1).distance.toFixed(1)}</DistanceMeters><Intensity>Active</Intensity><TriggerMethod>Manual</TriggerMethod>
<Track>
${points}
</Track></Lap></Activity></Activities>
</TrainingCenterDatabase>
`;
}

export const file = (name: string, content: string) => ({
  name,
  mimeType: "application/octet-stream",
  buffer: Buffer.from(content, "utf8"),
});
