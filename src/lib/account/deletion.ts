/** Texto que hay que escribir para confirmar el borrado de la cuenta (ADR-028). */
export const DELETE_CONFIRMATION = "BORRAR";

export type DeletionError = "confirm" | "password" | "wrongPassword" | "tooMany" | "session" | "unavailable";

export type DeleteAccountState = { status: "idle" } | { status: "error"; error: DeletionError; minutes?: number };

export const DELETION_IDLE: DeleteAccountState = { status: "idle" };

/** Valida el formulario antes de llamar a la API: confirmación exacta y contraseña presente. */
export function parseDeletionForm(
  form: FormData,
): { ok: true; password: string } | { ok: false; error: "confirm" | "password" } {
  const confirmation = String(form.get("confirmation") ?? "").trim();
  if (confirmation !== DELETE_CONFIRMATION) return { ok: false, error: "confirm" };
  const password = String(form.get("password") ?? "");
  if (!password || password.length > 1024) return { ok: false, error: "password" };
  return { ok: true, password };
}

/** Traduce una respuesta fallida de POST /me/deletion. */
export function deletionFailure(status: number, retryAfter: string | null): DeleteAccountState {
  switch (status) {
    case 403:
      return { status: "error", error: "wrongPassword" };
    case 429: {
      const seconds = Number(retryAfter ?? "60");
      return { status: "error", error: "tooMany", minutes: Math.max(1, Math.ceil((seconds || 60) / 60)) };
    }
    case 401:
      return { status: "error", error: "session" };
    case 400:
      return { status: "error", error: "password" };
    default:
      return { status: "error", error: "unavailable" };
  }
}
