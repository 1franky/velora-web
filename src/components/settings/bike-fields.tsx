"use client";

import { useTranslations } from "next-intl";
import { SelectField, TextField } from "@/components/forms/fields";
import type { FormState } from "@/lib/catalog/form-state";
import { BIKE_TYPES } from "@/lib/catalog/forms";

type BikeValues = {
  name?: string;
  bikeType?: string;
  brand?: string | null;
  model?: string | null;
  weightKg?: number | null;
};

export function BikeFields({ state, values = {} }: { state: FormState; values?: BikeValues }) {
  const t = useTranslations("settings.bikes");
  const error = (name: string) => (state.status === "error" ? state.fields?.[name] : undefined);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <TextField
        name="name"
        label={t("name")}
        defaultValue={values.name}
        maxLength={100}
        required
        error={error("name")}
      />
      <SelectField
        name="bikeType"
        label={t("type")}
        defaultValue={values.bikeType ?? "GRAVEL"}
        error={error("bikeType")}
      >
        {BIKE_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`types.${type}`)}
          </option>
        ))}
      </SelectField>
      <TextField name="brand" label={t("brand")} defaultValue={values.brand} maxLength={100} error={error("brand")} />
      <TextField name="model" label={t("model")} defaultValue={values.model} maxLength={100} error={error("model")} />
      <TextField
        name="weightKg"
        label={t("weight")}
        defaultValue={values.weightKg}
        inputMode="decimal"
        hint={t("weightHint")}
        error={error("weightKg")}
      />
    </div>
  );
}
