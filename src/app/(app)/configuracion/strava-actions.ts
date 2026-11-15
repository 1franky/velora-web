"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { api } from "@/lib/auth/session";

const BACK = "/configuracion";

/** Pide a la API la URL de autorización de Strava y lleva al usuario ahí (ADR-030). */
export async function connectStravaAction() {
  let url: string | undefined;
  try {
    const { data } = await (await api()).POST("/integrations/strava/authorization");
    url = data?.authorizationUrl;
  } catch {
    url = undefined;
  }
  redirect(url ?? `${BACK}?strava=error#strava`);
}

/** Desconecta Strava; con la casilla marcada, borra también lo importado de Strava. */
export async function disconnectStravaAction(form: FormData) {
  let ok = false;
  try {
    const { response } = await (
      await api()
    ).DELETE("/integrations/strava/connection", {
      params: { query: { deleteActivities: form.get("borrar") === "si" } },
    });
    ok = response.ok;
  } catch {
    ok = false;
  }
  revalidatePath(BACK);
  redirect(`${BACK}?strava=${ok ? "desconectado" : "error"}#strava`);
}
