import type { LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";

/** Sección aún no construida: dice qué contendrá, en palabras del usuario. */
export async function ComingSoon({ section, icon: Icon }: { section: string; icon: LucideIcon }) {
  const t = await getTranslations("sections");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-10 lg:px-10 lg:py-14">
      <h1 className="text-4xl font-bold tracking-tight">{t(`${section}.title`)}</h1>
      <div className="flex max-w-2xl items-start gap-4 rounded-lg border border-linea bg-superficie p-5">
        <Icon aria-hidden size={28} strokeWidth={1.5} className="mt-0.5 shrink-0 text-acento" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold">{t("soonLabel")}</p>
          <p className="max-w-prose text-tinta-suave">{t(`${section}.body`)}</p>
        </div>
      </div>
    </div>
  );
}
