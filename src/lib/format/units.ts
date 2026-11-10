/**
 * Formatos visibles en es-MX (06-web-application.md §5): siempre con Intl, nunca concatenando. La API entrega SI
 * (m, s, m/s); aquí se convierte a las unidades de presentación (km, m, km/h).
 */
const LOCALE = "es-MX";

const kilometers = new Intl.NumberFormat(LOCALE, {
  style: "unit",
  unit: "kilometer",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const meters = new Intl.NumberFormat(LOCALE, {
  style: "unit",
  unit: "meter",
  maximumFractionDigits: 0,
});

const kilometersPerHour = new Intl.NumberFormat(LOCALE, {
  style: "unit",
  unit: "kilometer-per-hour",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const duration = new Intl.DurationFormat(LOCALE, { style: "digital", hoursDisplay: "always" });

/** Fecha de calendario (sin hora) como dd/MM/yyyy; se interpreta en UTC para no desplazar el día. */
const calendarDate = new Intl.DateTimeFormat(LOCALE, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

/** Texto para un dato ausente: nunca se muestra 0 en su lugar (02: las métricas faltantes no son cero). */
export const MISSING = "—";

export function formatDistance(distanceMeters: number | null | undefined): string {
  return distanceMeters == null ? MISSING : kilometers.format(distanceMeters / 1000);
}

export function formatElevation(elevationMeters: number | null | undefined): string {
  return elevationMeters == null ? MISSING : meters.format(elevationMeters);
}

export function formatSpeed(speedMps: number | null | undefined): string {
  return speedMps == null ? MISSING : kilometersPerHour.format(speedMps * 3.6);
}

/** h:mm:ss (02-domain-and-data-model.md §4). */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null) {
    return MISSING;
  }
  const rounded = Math.max(0, Math.round(totalSeconds));
  return duration.format({
    hours: Math.floor(rounded / 3600),
    minutes: Math.floor((rounded % 3600) / 60),
    seconds: rounded % 60,
  });
}

/** Fecha local "YYYY-MM-DD" de la API (localStartDate) como dd/MM/yyyy. */
export function formatLocalDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return MISSING;
  }
  return calendarDate.format(new Date(`${isoDate}T00:00:00Z`));
}

const weekdayDate = new Intl.DateTimeFormat(LOCALE, {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** Fecha local "YYYY-MM-DD" con día de la semana, para listas: "dom, 9 nov 2026". */
export function formatWeekdayDate(isoDate: string | null | undefined): string {
  if (!isoDate) {
    return MISSING;
  }
  return weekdayDate.format(new Date(`${isoDate}T00:00:00Z`)).replaceAll(".", "");
}

const megabytes = new Intl.NumberFormat(LOCALE, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 });
const kilobytes = new Intl.NumberFormat(LOCALE, { style: "unit", unit: "kilobyte", maximumFractionDigits: 0 });

/** Tamaño de archivo en KB o MB (base 1024, como lo muestran los sistemas operativos). */
export function formatFileSize(bytes: number): string {
  const kb = bytes / 1024;
  return kb < 1024 ? kilobytes.format(Math.max(1, kb)) : megabytes.format(kb / 1024);
}

/** Fecha de un instante (ISO con zona) en la zona horaria indicada, como dd/MM/yyyy. */
export function formatInstantDate(instant: string, timeZone: string): string {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) {
    return MISSING;
  }
  try {
    return new Intl.DateTimeFormat(LOCALE, { day: "2-digit", month: "2-digit", year: "numeric", timeZone }).format(
      date,
    );
  } catch {
    return calendarDate.format(date);
  }
}
