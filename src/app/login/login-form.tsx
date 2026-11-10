"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { login, type LoginState } from "@/lib/auth/actions";

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("login");
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <label className="flex flex-col gap-1">
        <span>{t("email")}</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          className="rounded-md border border-linea bg-superficie px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>{t("password")}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="rounded-md border border-linea bg-superficie px-3 py-2"
        />
      </label>
      <p role="alert" aria-live="polite" className="min-h-6 text-sm font-medium text-negativo">
        {state.error}
      </p>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110 disabled:opacity-60"
      >
        {pending ? t("submitting") : t("submit")}
      </button>
    </form>
  );
}
