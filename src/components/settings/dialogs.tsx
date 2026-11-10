"use client";

import { useTranslations } from "next-intl";
import { updateActivityAction } from "@/app/(app)/actividades/[id]/actions";
import { createBikeAction, createDeviceAction, updateBikeAction } from "@/app/(app)/configuracion/actions";
import { SelectField, TextField } from "@/components/forms/fields";
import { FormDialog } from "@/components/forms/form-dialog";
import { ACTIVITY_TYPES } from "@/lib/catalog/forms";
import { BikeFields } from "./bike-fields";
import { DeviceFields } from "./device-fields";

const primary = "rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110";
const small = "rounded-md border border-linea px-3 py-1.5 text-sm font-semibold hover:bg-superficie-hundida";

type BikeData = {
  id: string;
  name: string;
  bikeType: string;
  brand: string | null;
  model: string | null;
  weightKg: number | null;
};

export function AddBikeDialog() {
  const t = useTranslations("settings.bikes");
  return (
    <FormDialog
      triggerLabel={t("add")}
      triggerClassName={primary}
      title={t("addTitle")}
      submitLabel={t("addSubmit")}
      pendingLabel={t("saving")}
      action={createBikeAction}
    >
      {(state) => <BikeFields state={state} />}
    </FormDialog>
  );
}

export function EditBikeDialog({ bike }: { bike: BikeData }) {
  const t = useTranslations("settings.bikes");
  return (
    <FormDialog
      triggerLabel={t("edit")}
      triggerClassName={small}
      title={t("editTitle", { name: bike.name })}
      submitLabel={t("editSubmit")}
      pendingLabel={t("saving")}
      action={updateBikeAction}
      hidden={{ bikeId: bike.id }}
    >
      {(state) => <BikeFields state={state} values={bike} />}
    </FormDialog>
  );
}

export function AddDeviceDialog() {
  const t = useTranslations("settings.devices");
  return (
    <FormDialog
      triggerLabel={t("add")}
      triggerClassName={primary}
      title={t("addTitle")}
      submitLabel={t("addSubmit")}
      pendingLabel={t("saving")}
      action={createDeviceAction}
    >
      {(state) => <DeviceFields state={state} />}
    </FormDialog>
  );
}

type ActivityData = { id: string; title: string; subType: string; bikeId: string | null };
type BikeOption = { id: string; name: string; active: boolean };

/** Corrige título, tipo y bicicleta. Las bicicletas retiradas solo aparecen si ya estaban asignadas. */
export function EditActivityDialog({ activity, bikes }: { activity: ActivityData; bikes: BikeOption[] }) {
  const t = useTranslations("editActivity");
  const ta = useTranslations("activities.types");
  const options = bikes.filter((bike) => bike.active || bike.id === activity.bikeId);
  return (
    <FormDialog
      triggerLabel={t("trigger")}
      triggerClassName={small}
      title={t("title")}
      submitLabel={t("submit")}
      pendingLabel={t("saving")}
      action={updateActivityAction}
      hidden={{ activityId: activity.id }}
    >
      {(state) => {
        const error = (name: string) => (state.status === "error" ? state.fields?.[name] : undefined);
        return (
          <div className="grid gap-4">
            <TextField
              name="title"
              label={t("name")}
              defaultValue={activity.title}
              maxLength={200}
              required
              error={error("title")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField name="subType" label={t("type")} defaultValue={activity.subType} error={error("subType")}>
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {ta(type)}
                  </option>
                ))}
              </SelectField>
              <SelectField
                name="bikeId"
                label={t("bike")}
                defaultValue={activity.bikeId ?? ""}
                hint={options.length === 0 ? t("noBikes") : undefined}
                error={error("bikeId")}
              >
                <option value="">{t("withoutBike")}</option>
                {options.map((bike) => (
                  <option key={bike.id} value={bike.id}>
                    {bike.active ? bike.name : t("retired", { name: bike.name })}
                  </option>
                ))}
              </SelectField>
            </div>
          </div>
        );
      }}
    </FormDialog>
  );
}
