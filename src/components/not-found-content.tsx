import { getTranslations } from "next-intl/server";
import Link from "next/link";

/** Contenido de "no encontrado". El llamador decide el contenedor (dentro o fuera de la estructura de la app). */
export async function NotFoundContent() {
  const t = await getTranslations("notFound");
  return (
    <div className="mx-auto flex max-w-5xl flex-col items-start gap-3 px-6 py-10 lg:px-10 lg:py-14">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <p className="max-w-prose text-tinta-suave">{t("body")}</p>
      <Link href="/" className="font-semibold text-acento underline underline-offset-4">
        {t("home")}
      </Link>
    </div>
  );
}
