"use client";

import { useTranslations } from "next-intl";
import { TextField } from "@/components/forms/fields";
import type { FormState } from "@/lib/catalog/form-state";

export function DeviceFields({ state }: { state: FormState }) {
  const t = useTranslations("settings.devices");
  const error = (name: string) => (state.status === "error" ? state.fields?.[name] : undefined);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        name="displayName"
        label={t("name")}
        maxLength={100}
        required
        hint={t("nameHint")}
        error={error("displayName")}
      />
      <TextField name="manufacturer" label={t("manufacturer")} maxLength={100} error={error("manufacturer")} />
      <TextField name="model" label={t("model")} maxLength={100} error={error("model")} />
    </div>
  );
}
