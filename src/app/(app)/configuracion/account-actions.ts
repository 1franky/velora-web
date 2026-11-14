"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { deletionFailure, parseDeletionForm, type DeleteAccountState } from "@/lib/account/deletion";
import { clientAddress } from "@/lib/auth/client-address";
import { api, takeAndClearTokens } from "@/lib/auth/session";

/**
 * Borra la cuenta y todos sus datos (ADR-028). La API confirma la contraseña y aplica el límite de intentos por IP,
 * así que se reenvía la del navegador. Al terminar, la sesión ya no existe: se borran las cookies y se va al login.
 */
export async function deleteAccountAction(_previous: DeleteAccountState, form: FormData): Promise<DeleteAccountState> {
  const parsed = parseDeletionForm(form);
  if (!parsed.ok) return { status: "error", error: parsed.error };

  const address = clientAddress(await headers());
  let response: Response;
  try {
    ({ response } = await (
      await api()
    ).POST("/me/deletion", {
      body: { password: parsed.password },
      headers: address ? { "X-Forwarded-For": address } : undefined,
    }));
  } catch {
    return { status: "error", error: "unavailable" };
  }
  if (response.status !== 204) return deletionFailure(response.status, response.headers.get("Retry-After"));

  await takeAndClearTokens();
  redirect("/login?cuenta=borrada");
}
