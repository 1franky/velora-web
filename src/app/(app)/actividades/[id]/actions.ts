"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteActivity, reprocessActivity, type ActionError } from "@/lib/activities/data";
import { updateActivity } from "@/lib/catalog/data";
import type { FormState } from "@/lib/catalog/form-state";
import { parseActivityForm } from "@/lib/catalog/forms";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Borra la actividad y vuelve a la lista con un aviso. Pensada para `useActionState` (form action). */
export async function deleteActivityAction(_previous: FormState, form: FormData): Promise<FormState> {
  const id = String(form.get("activityId") ?? "");
  if (!UUID.test(id)) return { status: "error", error: "invalid" };
  const result = await deleteActivity(id);
  // Ya borrada (otra pestaña): el resultado es el mismo que el usuario pidió.
  if (!result.ok && result.error !== "notFound") return { status: "error", error: result.error };
  revalidatePath("/", "layout");
  redirect("/actividades?aviso=borrada");
}

/**
 * Resolver un duplicado: conserva una actividad y borra la otra. Vuelve al detalle de la conservada, donde se ven
 * los posibles duplicados restantes (p. ej. la tercera copia de una rodada en FIT, GPX y TCX).
 */
export async function keepActivityAction(_previous: FormState, form: FormData): Promise<FormState> {
  const keep = String(form.get("keepId") ?? "");
  const remove = String(form.get("deleteId") ?? "");
  if (!UUID.test(keep) || !UUID.test(remove) || keep === remove) return { status: "error", error: "invalid" };
  const result = await deleteActivity(remove);
  if (!result.ok && result.error !== "notFound") return { status: "error", error: result.error };
  revalidatePath("/", "layout");
  redirect(`/actividades/${keep}?aviso=duplicado-resuelto`);
}

/** Inicia el reproceso; el navegador sigue el trabajo y refresca el detalle al terminar. */
export async function reprocessActivityAction(
  id: string,
): Promise<{ ok: true; jobId: string } | { ok: false; error: ActionError }> {
  if (!UUID.test(id)) return { ok: false, error: "invalid" };
  return reprocessActivity(id);
}

/** Tras un reproceso terminado: las métricas guardadas en el navegador quedan viejas. */
export async function activityRecalculated(): Promise<void> {
  revalidatePath("/", "layout");
}

/** Corrige título, tipo y bicicleta (PATCH /activities/{id}). */
export async function updateActivityAction(_previous: FormState, form: FormData): Promise<FormState> {
  const activityId = String(form.get("activityId") ?? "");
  if (!UUID.test(activityId)) return { status: "error", error: "invalid" };
  const parsed = parseActivityForm(form);
  if (!parsed.ok) return { status: "error", fields: parsed.fields };
  const result = await updateActivity(activityId, parsed.value);
  if (!result.ok) return { status: "error", error: result.error, detail: result.detail };
  revalidatePath("/", "layout");
  return { status: "ok", at: Date.now() };
}
