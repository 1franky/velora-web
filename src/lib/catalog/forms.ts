/**
 * Validación de los formularios de Configuración y de edición de actividades, antes de llamar a la API. Los errores
 * son códigos por campo que la interfaz traduce; la API vuelve a validar.
 */
export const BIKE_TYPES = ["MTB", "ROAD", "GRAVEL", "OTHER"] as const;
export const ACTIVITY_TYPES = ["MOUNTAIN_BIKE", "ROAD", "GRAVEL", "INDOOR", "OTHER"] as const;

export type FieldError = "required" | "tooLong" | "invalid" | "range" | "heartRate";
export type Parsed<T> = { ok: true; value: T } | { ok: false; fields: Record<string, FieldError> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function required(form: FormData, name: string, max: number, fields: Record<string, FieldError>) {
  const value = text(form, name);
  if (!value) fields[name] = "required";
  else if (value.length > max) fields[name] = "tooLong";
  return value;
}

function optional(form: FormData, name: string, max: number, fields: Record<string, FieldError>) {
  const value = text(form, name);
  if (value.length > max) fields[name] = "tooLong";
  return value || null;
}

function oneOf<T extends string>(
  form: FormData,
  name: string,
  options: readonly T[],
  fields: Record<string, FieldError>,
) {
  const value = text(form, name);
  const match = options.find((option) => option === value);
  if (!match) fields[name] = value ? "invalid" : "required";
  return match as T;
}

function done<T>(value: T, fields: Record<string, FieldError>): Parsed<T> {
  return Object.keys(fields).length ? { ok: false, fields } : { ok: true, value };
}

export function parseBikeForm(form: FormData) {
  const fields: Record<string, FieldError> = {};
  const name = required(form, "name", 100, fields);
  const bikeType = oneOf(form, "bikeType", BIKE_TYPES, fields);
  const brand = optional(form, "brand", 100, fields);
  const model = optional(form, "model", 100, fields);
  const rawWeight = text(form, "weightKg").replace(",", ".");
  let weightKg: number | null = null;
  if (rawWeight) {
    const parsed = Number(rawWeight);
    if (!Number.isFinite(parsed)) fields.weightKg = "invalid";
    else if (parsed <= 0 || parsed > 50) fields.weightKg = "range";
    else weightKg = Math.round(parsed * 100) / 100;
  }
  return done({ name, bikeType, brand, model, weightKg }, fields);
}

export function parseDeviceForm(form: FormData) {
  const fields: Record<string, FieldError> = {};
  const displayName = required(form, "displayName", 100, fields);
  const manufacturer = optional(form, "manufacturer", 100, fields);
  const model = optional(form, "model", 100, fields);
  return done({ displayName, manufacturer, model }, fields);
}

export function parseActivityForm(form: FormData) {
  const fields: Record<string, FieldError> = {};
  const title = required(form, "title", 200, fields);
  const subType = oneOf(form, "subType", ACTIVITY_TYPES, fields);
  const bike = text(form, "bikeId");
  if (bike && !UUID.test(bike)) fields.bikeId = "invalid";
  return done({ title, subType, bikeId: bike ? bike.toLowerCase() : null }, fields);
}

/** Zona IANA que el entorno conoce (la API también la valida). */
export function isValidTimeZone(value: string): boolean {
  if (!value || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("es-MX", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Zonas de México primero (las que alguien en México elegiría), luego el resto en orden alfabético. */
export const MEXICO_TIME_ZONES = [
  "America/Mexico_City",
  "America/Monterrey",
  "America/Merida",
  "America/Cancun",
  "America/Chihuahua",
  "America/Ciudad_Juarez",
  "America/Ojinaga",
  "America/Matamoros",
  "America/Mazatlan",
  "America/Hermosillo",
  "America/Tijuana",
  "America/Bahia_Banderas",
] as const;

/**
 * FC máxima del formulario (ADR-020): vacío la borra (0 para la API); si no, un entero entre 100 y 230 ppm.
 */
export function parseMaxHeartRate(raw: FormDataEntryValue | null): { ok: true; value: number } | { ok: false } {
  const text = String(raw ?? "").trim();
  if (text === "") return { ok: true, value: 0 };
  const value = Number(text);
  return Number.isInteger(value) && value >= 100 && value <= 230 ? { ok: true, value } : { ok: false };
}
