"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { saveTimeZoneAction } from "@/app/(app)/configuracion/actions";
import { SelectField } from "@/components/forms/fields";
import { IDLE } from "@/lib/catalog/form-state";

type Zone = { id: string; label: string };

/** Zona horaria de la cuenta: define la fecha local de las rodadas que se importen después. */
export function TimeZoneForm({ current, mexico, others }: { current: string; mexico: Zone[]; others: Zone[] }) {
  const t = useTranslations("settings.timeZone");
  const [state, action, pending] = useActionState(saveTimeZoneAction, IDLE);
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-3">
      <SelectField
        name="timeZone"
        label={t("label")}
        defaultValue={current}
        hint={t("hint")}
        error={state.status === "error" ? state.fields?.timeZone : undefined}
      >
        <optgroup label={t("mexico")}>
          {mexico.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.label}
            </option>
          ))}
        </optgroup>
        <optgroup label={t("others")}>
          {others.map((zone) => (
            <option key={zone.id} value={zone.id}>
              {zone.label}
            </option>
          ))}
        </optgroup>
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
