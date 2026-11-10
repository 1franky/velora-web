import { Route } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/shell/coming-soon";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("nav"))("rutas") };
}

export default function Page() {
  return <ComingSoon section="rutas" icon={Route} />;
}
