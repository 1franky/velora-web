"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveMaxHeartRateAction } from "@/app/(app)/configuracion/actions";
import { TextField } from "@/components/forms/fields";
import { IDLE } from "@/lib/catalog/form-state";

/** FC máxima opcional (ADR-020): sin ella Rendimiento no muestra zonas cardiacas. */
export function HeartRateForm({ current }: { current: number | null }) {
  const t = useTranslations("settings.heartRate");
  const [state, action, pending] = useActionState(saveMaxHeartRateAction, IDLE);
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-3">
      <div className="max-w-xs">
        <TextField
          name="maxHeartRateBpm"
          label={t("label")}
          hint={t("fieldHint")}
          inputMode="decimal"
          maxLength={3}
          defaultValue={current}
          error={state.status === "error" ? state.fields?.maxHeartRateBpm : undefined}
        />
      </div>
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
