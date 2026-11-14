"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createApiClient } from "@/lib/api/client";
import { clientAddress } from "./client-address";
import { apiBaseUrl } from "./config";
import { safeNextPath } from "./cookies";
import { storeTokens, takeAndClearTokens } from "./session";

export type LoginState = { error?: string; email?: string };

/**
 * Inicia sesión contra la API y guarda los tokens en cookies HttpOnly. Next compara Origin y Host en toda server
 * action (CSRF). Los mensajes de error vienen de messages/es-MX.json; nunca se registran contraseñas ni tokens.
 */
export async function login(_previous: LoginState, form: FormData): Promise<LoginState> {
  const t = await getTranslations("login.errors");
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) {
    return { error: t("required"), email };
  }

  // La API limita intentos por IP: sin esto, todos los navegadores contarían como el contenedor web.
  const address = clientAddress(await headers());
  let result;
  try {
    result = await createApiClient(apiBaseUrl()).POST("/auth/login", {
      body: { email, password },
      headers: address ? { "X-Forwarded-For": address } : undefined,
    });
  } catch {
    return { error: t("unavailable"), email };
  }
  const { data, response } = result;
  if (!data) {
    if (response.status === 401) {
      return { error: t("invalidCredentials"), email };
    }
    if (response.status === 429) {
      const seconds = Number(response.headers.get("Retry-After") ?? "60");
      return { error: t("tooManyAttempts", { minutes: Math.max(1, Math.ceil(seconds / 60)) }), email };
    }
    if (response.status === 400) {
      return { error: t("invalidInput"), email };
    }
    return { error: t("unavailable"), email };
  }

  await storeTokens(data);
  redirect(safeNextPath(String(form.get("next") ?? "")));
}

/** Cierra la sesión en la API (revoca la familia de tokens) y borra las cookies, aunque la API no responda. */
export async function logout(): Promise<void> {
  const refreshToken = await takeAndClearTokens();
  if (refreshToken) {
    try {
      await createApiClient(apiBaseUrl()).POST("/auth/logout", { body: { refreshToken } });
    } catch {
      // Las cookies ya se borraron; la sesión de la API caducará sola.
    }
  }
  redirect("/login");
}
