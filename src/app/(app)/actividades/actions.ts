"use server";

import { revalidatePath } from "next/cache";
import { listActivities, type ActivityPage, type Loaded } from "@/lib/activities/data";
import { sanitizeQuery, type ActivityQuery } from "@/lib/activities/filters";

/** Siguiente página de la lista. La consulta llega del navegador: se valida con las mismas reglas que la URL. */
export async function loadMoreActivities(query: ActivityQuery, cursor: string): Promise<Loaded<ActivityPage>> {
  if (typeof cursor !== "string" || cursor.length === 0 || cursor.length > 200) {
    return { ok: false, error: "invalid" };
  }
  return listActivities(sanitizeQuery(query), cursor);
}

/**
 * Tras importar, la lista, el detalle y el resumen de Inicio guardados en el navegador quedan viejos: se purga la
 * caché del cliente para que la siguiente visita los pida de nuevo.
 */
export async function activitiesChanged(): Promise<void> {
  revalidatePath("/", "layout");
}
