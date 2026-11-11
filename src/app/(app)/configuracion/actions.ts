"use server";

import { revalidatePath } from "next/cache";
import {
  createBike,
  createDevice,
  deleteBike,
  updateBike,
  updateMaxHeartRate,
  updateTimeZone,
  updateTrackPrivacy,
  type WriteResult,
} from "@/lib/catalog/data";
import type { FormState } from "@/lib/catalog/form-state";
import { isValidTimeZone, parseBikeForm, parseDeviceForm, parseMaxHeartRate } from "@/lib/catalog/forms";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Traduce el resultado de la API al estado del formulario y refresca lo que depende de él. */
function settle(result: WriteResult<unknown>): FormState {
  if (!result.ok) return { status: "error", error: result.error, detail: result.detail };
  // Bicicletas y zona horaria aparecen en la lista, el detalle y la importación.
  revalidatePath("/", "layout");
  return { status: "ok", at: Date.now() };
}

export async function saveTimeZoneAction(_previous: FormState, form: FormData): Promise<FormState> {
  const timeZone = String(form.get("timeZone") ?? "");
  if (!isValidTimeZone(timeZone)) return { status: "error", fields: { timeZone: "invalid" } };
  return settle(await updateTimeZone(timeZone));
}

/** Metros que se ocultan al inicio y al final de cada recorrido (ADR-016); 0 la desactiva. */
const PRIVACY_STEPS = [0, 200, 300, 500, 1000] as const;

export async function savePrivacyAction(_previous: FormState, form: FormData): Promise<FormState> {
  const meters = Number(form.get("trackPrivacyMeters"));
  const step = PRIVACY_STEPS.find((value) => value === meters);
  if (step === undefined) return { status: "error", fields: { trackPrivacyMeters: "invalid" } };
  return settle(await updateTrackPrivacy(step));
}

/** FC máxima para las zonas cardiacas (ADR-020); vacía la borra. */
export async function saveMaxHeartRateAction(_previous: FormState, form: FormData): Promise<FormState> {
  const parsed = parseMaxHeartRate(form.get("maxHeartRateBpm"));
  if (!parsed.ok) return { status: "error", fields: { maxHeartRateBpm: "heartRate" } };
  return settle(await updateMaxHeartRate(parsed.value));
}

export async function createBikeAction(_previous: FormState, form: FormData): Promise<FormState> {
  const parsed = parseBikeForm(form);
  if (!parsed.ok) return { status: "error", fields: parsed.fields };
  return settle(await createBike(parsed.value));
}

export async function updateBikeAction(_previous: FormState, form: FormData): Promise<FormState> {
  const bikeId = String(form.get("bikeId") ?? "");
  if (!UUID.test(bikeId)) return { status: "error", error: "invalid" };
  const parsed = parseBikeForm(form);
  if (!parsed.ok) return { status: "error", fields: parsed.fields };
  return settle(await updateBike(bikeId, parsed.value));
}

/** Retirar o reactivar: la bicicleta deja de ofrecerse pero conserva su historial. */
export async function setBikeActiveAction(_previous: FormState, form: FormData): Promise<FormState> {
  const bikeId = String(form.get("bikeId") ?? "");
  if (!UUID.test(bikeId)) return { status: "error", error: "invalid" };
  return settle(await updateBike(bikeId, { active: form.get("active") === "true" }));
}

export async function deleteBikeAction(_previous: FormState, form: FormData): Promise<FormState> {
  const bikeId = String(form.get("bikeId") ?? "");
  if (!UUID.test(bikeId)) return { status: "error", error: "invalid" };
  const result = await deleteBike(bikeId);
  return settle(!result.ok && result.error === "notFound" ? { ok: true, data: null } : result);
}

export async function createDeviceAction(_previous: FormState, form: FormData): Promise<FormState> {
  const parsed = parseDeviceForm(form);
  if (!parsed.ok) return { status: "error", fields: parsed.fields };
  return settle(await createDevice(parsed.value));
}
