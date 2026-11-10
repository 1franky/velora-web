"use client";

import { useTranslations } from "next-intl";
import { useSyncExternalStore } from "react";
import { applyTheme, readThemePreference, subscribeTheme, type ThemePreference } from "@/lib/theme";

const OPTIONS: readonly ThemePreference[] = ["system", "light", "dark"];

export function ThemeSelector() {
  const t = useTranslations("settings");
  // En el servidor no hay localStorage: se renderiza "system" y el navegador lo corrige sin desajuste.
  const value = useSyncExternalStore(subscribeTheme, readThemePreference, () => "system" as ThemePreference);

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="sr-only">{t("appearance")}</legend>
      {OPTIONS.map((option) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-3 rounded-md border border-linea bg-superficie px-4 py-3 has-checked:border-acento-medio"
        >
          <input
            type="radio"
            name="tema"
            value={option}
            checked={value === option}
            onChange={() => applyTheme(option)}
            className="accent-acento-medio"
          />
          {t(`theme.${option}`)}
        </label>
      ))}
    </fieldset>
  );
}
