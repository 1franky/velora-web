"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { deleteAccountAction } from "@/app/(app)/configuracion/account-actions";
import { TextField } from "@/components/forms/fields";
import { DELETE_CONFIRMATION, DELETION_IDLE } from "@/lib/account/deletion";

/** Borrado irreversible de la cuenta (ADR-028): pide la contraseña y escribir BORRAR. */
export function DeleteAccountForm() {
  const t = useTranslations("settings.data.delete");
  const [state, action, pending] = useActionState(deleteAccountAction, DELETION_IDLE);
  const error = state.status === "error" ? state.error : undefined;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-lg border border-negativo bg-superficie p-4">
      <h3 className="text-lg font-semibold text-negativo">{t("title")}</h3>
      <p className="text-sm">{t("body")}</p>
      <p className="text-sm text-tinta-suave">{t("backups")}</p>
      <div className="flex max-w-xs flex-col gap-3">
        <TextField
          name="password"
          type="password"
          autoComplete="current-password"
          label={t("password")}
          required
          error={error === "password" ? "required" : undefined}
        />
        <TextField
          name="confirmation"
          label={t("confirmation", { word: DELETE_CONFIRMATION })}
          autoComplete="off"
          required
          error={error === "confirm" ? "invalid" : undefined}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-negativo px-4 py-2 font-semibold text-sobre-negativo hover:brightness-110 disabled:opacity-60"
        >
          {pending ? t("deleting") : t("submit")}
        </button>
        <p role="status" className="text-sm font-medium text-negativo">
          {error && error !== "password" && error !== "confirm"
            ? t(`errors.${error}`, { minutes: state.status === "error" ? (state.minutes ?? 1) : 1 })
            : null}
        </p>
      </div>
    </form>
  );
}
