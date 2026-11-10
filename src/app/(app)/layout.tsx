import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Suspense } from "react";
import { BottomNav } from "@/components/shell/bottom-nav";
import { SideNav } from "@/components/shell/side-nav";
import { UserMenu } from "@/components/shell/user-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const t = await getTranslations("app");
  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-8 border-r border-linea bg-superficie px-3 py-6 lg:flex">
        <Link href="/" className="px-4 font-display text-3xl font-bold tracking-tight">
          {t("name")}
        </Link>
        <div className="flex-1">
          <SideNav />
        </div>
        <Suspense>
          <UserMenu />
        </Suspense>
      </aside>
      <main id="contenido" className="min-w-0 flex-1 pb-24 lg:pb-0">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
