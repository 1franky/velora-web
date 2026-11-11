"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { savePrivacyAction } from "@/app/(app)/configuracion/actions";
import { SelectField } from "@/components/forms/fields";
import { IDLE } from "@/lib/catalog/form-state";

const STEPS = ["0", "200", "300", "500", "1000"] as const;

/** Privacidad de inicio y fin (ADR-016): se aplica en el servidor, a todos los mapas. */
export function PrivacyForm({ current }: { current: number }) {
  const t = useTranslations("settings.privacy");
  const [state, action, pending] = useActionState(savePrivacyAction, IDLE);
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-3">
      <SelectField
        name="trackPrivacyMeters"
        label={t("label")}
        defaultValue={String(current)}
        error={state.status === "error" ? state.fields?.trackPrivacyMeters : undefined}
      >
        {STEPS.map((step) => (
          <option key={step} value={step}>
            {t(`options.${step}`)}
          </option>
        ))}
      </SelectField>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110 disabled:opacity-60"
        >
          {pending ? t("saving") : t("save")}
        </button>
        <p role="status" className="text-sm font-medium">
          {state.status === "ok" && t("saved")}
          {state.status === "error" && !state.fields && (
            <span className="text-negativo">{state.detail ?? t("error")}</span>
          )}
        </p>
      </div>
    </form>
  );
}
