import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ThemeSelector } from "@/components/theme-selector";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("configuracion") };
}

export default async function SettingsPage() {
  const t = await getTranslations("settings");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10 lg:px-10 lg:py-14">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <section aria-labelledby="apariencia" className="flex max-w-2xl flex-col gap-3">
        <div>
          <h2 id="apariencia" className="text-2xl font-semibold">
            {t("appearance")}
          </h2>
          <p className="text-sm text-tinta-suave">{t("appearanceHint")}</p>
        </div>
        <ThemeSelector />
      </section>
      <p className="max-w-prose text-tinta-suave">{t("moreSoon")}</p>
    </div>
  );
}
