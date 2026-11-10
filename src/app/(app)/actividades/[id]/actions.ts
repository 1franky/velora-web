"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteActivity, reprocessActivity, type ActionError } from "@/lib/activities/data";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ActionState = { error: ActionError } | null;

/** Borra la actividad y vuelve a la lista con un aviso. Pensada para `useActionState` (form action). */
export async function deleteActivityAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const id = String(form.get("activityId") ?? "");
  if (!UUID.test(id)) return { error: "invalid" };
  const result = await deleteActivity(id);
  // Ya borrada (otra pestaña): el resultado es el mismo que el usuario pidió.
  if (!result.ok && result.error !== "notFound") return { error: result.error };
  revalidatePath("/", "layout");
  redirect("/actividades?aviso=borrada");
}

/**
 * Resolver un duplicado: conserva una actividad y borra la otra. Vuelve al detalle de la conservada, donde se ven
 * los posibles duplicados restantes (p. ej. la tercera copia de una rodada en FIT, GPX y TCX).
 */
export async function keepActivityAction(_previous: ActionState, form: FormData): Promise<ActionState> {
  const keep = String(form.get("keepId") ?? "");
  const remove = String(form.get("deleteId") ?? "");
  if (!UUID.test(keep) || !UUID.test(remove) || keep === remove) return { error: "invalid" };
  const result = await deleteActivity(remove);
  if (!result.ok && result.error !== "notFound") return { error: result.error };
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
