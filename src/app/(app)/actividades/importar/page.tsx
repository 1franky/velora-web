import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Importer } from "@/components/activities/importer";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("imports"))("title") };
}

export default async function ImportPage() {
  const [t, ta] = await Promise.all([getTranslations("imports"), getTranslations("activities.detail")]);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10 lg:px-10 lg:py-14">
      <Link
        href="/actividades"
        className="inline-flex items-center gap-1.5 self-start font-medium text-tinta-suave hover:text-tinta"
      >
        <ArrowLeft aria-hidden size={18} strokeWidth={2} />
        {ta("back")}
      </Link>
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-tinta-suave">{t("intro")}</p>
      </div>
      <div className="max-w-2xl">
        <Importer />
      </div>
    </div>
  );
}
