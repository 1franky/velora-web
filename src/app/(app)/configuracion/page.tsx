import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { BikeActiveToggle } from "@/components/settings/bike-active-toggle";
import { PrivacyForm } from "@/components/settings/privacy-form";
import { AddBikeDialog, AddDeviceDialog, EditBikeDialog } from "@/components/settings/dialogs";
import { TimeZoneForm } from "@/components/settings/time-zone-form";
import { ThemeSelector } from "@/components/theme-selector";
import { deleteBikeAction } from "./actions";
import { getMe, listAllBikes, listDevices } from "@/lib/catalog/data";
import { MEXICO_TIME_ZONES } from "@/lib/catalog/forms";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("configuracion") };
}

const skeleton = <div aria-hidden className="h-24 max-w-2xl animate-pulse rounded-lg bg-superficie-hundida" />;

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-10 lg:px-10 lg:py-14">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>

      <Section id="zona-horaria" title={t("timeZone.title")} hint={t("units")}>
        <Suspense fallback={skeleton}>
          <TimeZone />
        </Suspense>
      </Section>

      <Section id="privacidad" title={t("privacy.title")} hint={t("privacy.hint")}>
        <Suspense fallback={skeleton}>
          <Privacy />
        </Suspense>
      </Section>

      <Section id="bicicletas" title={t("bikes.title")} hint={t("bikes.hint")}>
        <Suspense fallback={skeleton}>
          <Bikes />
        </Suspense>
      </Section>

      <Section id="dispositivos" title={t("devices.title")} hint={t("devices.hint")}>
        <Suspense fallback={skeleton}>
          <Devices />
        </Suspense>
      </Section>

      <Section id="apariencia" title={t("appearance")} hint={t("appearanceHint")}>
        <div className="max-w-2xl">
          <ThemeSelector />
        </div>
      </Section>
    </div>
  );
}

function Section({
  id,
  title,
  hint,
  children,
}: {
  id: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex max-w-2xl flex-col gap-1">
        <h2 id={id} className="text-2xl font-semibold">
          {title}
        </h2>
        <p className="text-sm text-tinta-suave">{hint}</p>
      </div>
      {children}
    </section>
  );
}

/** Nombres en español de las zonas de México; el resto se muestra con su identificador IANA legible. */
const MEXICO_LABELS: Record<string, string> = {
  "America/Mexico_City": "Ciudad de México y centro",
  "America/Monterrey": "Monterrey",
  "America/Merida": "Mérida",
  "America/Cancun": "Cancún y Quintana Roo",
  "America/Chihuahua": "Chihuahua",
  "America/Ciudad_Juarez": "Ciudad Juárez",
  "America/Ojinaga": "Ojinaga",
  "America/Matamoros": "Matamoros",
  "America/Mazatlan": "Mazatlán, Sinaloa y Nayarit",
  "America/Hermosillo": "Sonora",
  "America/Tijuana": "Tijuana y Baja California",
  "America/Bahia_Banderas": "Bahía de Banderas",
};

async function TimeZone() {
  const [me, t] = await Promise.all([getMe(), getTranslations("settings.timeZone")]);
  if (!me) return <p className="text-negativo">{t("unavailable")}</p>;
  const mexico = MEXICO_TIME_ZONES.map((id) => ({ id, label: MEXICO_LABELS[id] ?? id }));
  const known = new Set<string>(MEXICO_TIME_ZONES);
  const others = Intl.supportedValuesOf("timeZone")
    .filter((id) => !known.has(id))
    .map((id) => ({ id, label: id.replaceAll("_", " ") }));
  if (!known.has(me.preferences.timeZone) && !others.some((zone) => zone.id === me.preferences.timeZone)) {
    others.unshift({ id: me.preferences.timeZone, label: me.preferences.timeZone });
  }
  return <TimeZoneForm current={me.preferences.timeZone} mexico={mexico} others={others} />;
}

async function Privacy() {
  const [me, t] = await Promise.all([getMe(), getTranslations("settings.timeZone")]);
  if (!me) return <p className="text-negativo">{t("unavailable")}</p>;
  return <PrivacyForm current={me.preferences.trackPrivacyMeters} />;
}

async function Bikes() {
  const [bikes, t] = await Promise.all([listAllBikes(), getTranslations("settings.bikes")]);
  if (!bikes) return <p className="text-negativo">{t("unavailable")}</p>;
  const sorted = [...bikes].sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name, "es"));
  return (
    <div className="flex flex-col gap-4">
      {sorted.length === 0 ? (
        <p className="max-w-prose text-tinta-suave">{t("empty")}</p>
      ) : (
        <ul
          aria-label={t("listLabel")}
          className="flex flex-col divide-y divide-linea rounded-lg border border-linea bg-superficie"
        >
          {sorted.map((bike) => {
            const details = [bike.brand, bike.model].filter(Boolean).join(" ");
            return (
              <li key={bike.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
                <div className="flex min-w-48 flex-1 flex-col">
                  <span className="flex flex-wrap items-baseline gap-2">
                    <span className="font-semibold">{bike.name}</span>
                    {!bike.active && (
                      <span className="rounded bg-superficie-hundida px-1.5 py-0.5 text-xs font-medium text-tinta-suave">
                        {t("retired")}
                      </span>
                    )}
                  </span>
                  <span className="cifras text-sm text-tinta-suave">
                    {[
                      t(`types.${bike.bikeType}`),
                      details,
                      bike.weightKg ? t("weightValue", { kg: bike.weightKg }) : null,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <EditBikeDialog bike={bike} />
                  <BikeActiveToggle bikeId={bike.id} active={bike.active} name={bike.name} />
                  <ConfirmDialog
                    triggerLabel={t("delete")}
                    triggerClassName="rounded-md border border-negativo px-3 py-1.5 text-sm font-semibold text-negativo hover:bg-superficie-hundida"
                    title={t("deleteTitle", { name: bike.name })}
                    confirmLabel={t("deleteConfirm")}
                    pendingLabel={t("deleting")}
                    action={deleteBikeAction}
                    fields={{ bikeId: bike.id }}
                  >
                    <p>{t("deleteBody")}</p>
                    {bike.active && <p className="font-medium text-tinta">{t("deleteRetireInstead")}</p>}
                  </ConfirmDialog>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <AddBikeDialog />
      </div>
    </div>
  );
}

async function Devices() {
  const [devices, t] = await Promise.all([listDevices(), getTranslations("settings.devices")]);
  if (!devices) return <p className="text-negativo">{t("unavailable")}</p>;
  return (
    <div className="flex flex-col gap-4">
      {devices.length === 0 ? (
        <p className="max-w-prose text-tinta-suave">{t("empty")}</p>
      ) : (
        <ul
          aria-label={t("listLabel")}
          className="flex flex-col divide-y divide-linea rounded-lg border border-linea bg-superficie"
        >
          {devices.map((device) => (
            <li key={device.id} className="flex flex-col p-4">
              <span className="font-semibold">{device.displayName}</span>
              {(device.manufacturer || device.model) && (
                <span className="text-sm text-tinta-suave">
                  {[device.manufacturer, device.model].filter(Boolean).join(" ")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <div>
        <AddDeviceDialog />
      </div>
    </div>
  );
}
