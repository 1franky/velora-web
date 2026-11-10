import type { FieldError } from "./forms";

/** Estado de un formulario con server action (useActionState): éxito, error general o errores por campo. */
export type FormState =
  | { status: "idle" }
  | { status: "ok"; at: number }
  | {
      status: "error";
      error?: "session" | "invalid" | "notFound" | "unavailable";
      detail?: string;
      fields?: Record<string, FieldError>;
    };

export const IDLE: FormState = { status: "idle" };
