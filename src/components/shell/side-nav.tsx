"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { NAV_ITEMS, isActive } from "./nav-items";

/**
 * Riel lateral de escritorio. La sección activa se marca con una franja de carril en cempasúchil.
 *
 * La ruta actual es un dato de la solicitud en rutas dinámicas: el respaldo (sin sección activa) se prerenderiza y
 * la versión con la ruta llega enseguida.
 */
export function SideNav() {
  return (
    <Suspense fallback={<SideNavList pathname={null} />}>
      <CurrentSideNav />
    </Suspense>
  );
}

function CurrentSideNav() {
  return <SideNavList pathname={usePathname()} />;
}

function SideNavList({ pathname }: { pathname: string | null }) {
  const t = useTranslations();
  return (
    <nav aria-label={t("shell.primaryNav")}>
      <ul className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, href, icon: Icon }) => {
          const active = pathname !== null && isActive(href, pathname);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-3 rounded-md py-2 pr-3 pl-5 font-medium transition-colors ${
                  active
                    ? "bg-superficie-hundida text-tinta"
                    : "text-tinta-suave hover:bg-superficie-hundida hover:text-tinta"
                }`}
              >
                {active && (
                  <span aria-hidden className="absolute inset-y-1.5 left-1.5 w-1 rounded-full bg-acento-medio" />
                )}
                <Icon aria-hidden size={20} strokeWidth={1.75} />
                {t(`nav.${key}`)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
