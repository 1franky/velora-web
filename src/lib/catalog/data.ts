import "server-only";
import type { components } from "@/lib/api/schema";
import { api } from "@/lib/auth/session";

export type Bike = components["schemas"]["Bike"];
export type BikeCreate = components["schemas"]["BikeCreate"];
export type BikeUpdate = components["schemas"]["BikeUpdate"];
export type Device = components["schemas"]["Device"];
export type DeviceCreate = components["schemas"]["DeviceCreate"];
export type Preferences = components["schemas"]["Preferences"];

/** Resultado de una escritura: éxito o un error que la interfaz sabe explicar (con el detalle es-MX de la API). */
export type WriteResult<T> =
  { ok: true; data: T } | { ok: false; error: "session" | "invalid" | "notFound" | "unavailable"; detail?: string };

async function write<T>(
  call: () => Promise<{ data?: T; error?: { detail?: string }; response: Response }>,
): Promise<WriteResult<T>> {
  try {
    const { data, error, response } = await call();
    if (response.ok) return { ok: true, data: data as T };
    const detail = error?.detail;
    if (response.status === 401) return { ok: false, error: "session" };
    if (response.status === 400) return { ok: false, error: "invalid", detail };
    if (response.status === 404) return { ok: false, error: "notFound", detail };
    return { ok: false, error: "unavailable" };
  } catch {
    return { ok: false, error: "unavailable" };
  }
}

export async function getMe() {
  try {
    const { data } = await (await api()).GET("/me");
    return data ?? null;
  } catch {
    return null;
  }
}

export async function updateTimeZone(timeZone: string) {
  const client = await api();
  return write(() => client.PATCH("/me/preferences", { body: { timeZone } }));
}

export async function listAllBikes(): Promise<Bike[] | null> {
  try {
    const { data } = await (await api()).GET("/bikes");
    return data?.items ?? null;
  } catch {
    return null;
  }
}

export async function createBike(body: BikeCreate) {
  const client = await api();
  return write(() => client.POST("/bikes", { body }));
}

export async function updateBike(bikeId: string, body: BikeUpdate) {
  const client = await api();
  return write(() => client.PATCH("/bikes/{bikeId}", { params: { path: { bikeId } }, body }));
}

export async function deleteBike(bikeId: string) {
  const client = await api();
  return write(() => client.DELETE("/bikes/{bikeId}", { params: { path: { bikeId } } }));
}

export async function listDevices(): Promise<Device[] | null> {
  try {
    const { data } = await (await api()).GET("/devices");
    return data?.items ?? null;
  } catch {
    return null;
  }
}

export async function createDevice(body: DeviceCreate) {
  const client = await api();
  return write(() => client.POST("/devices", { body }));
}

export async function updateActivity(activityId: string, body: components["schemas"]["ActivityUpdate"]) {
  const client = await api();
  return write(() => client.PATCH("/activities/{activityId}", { params: { path: { activityId } }, body }));
}
