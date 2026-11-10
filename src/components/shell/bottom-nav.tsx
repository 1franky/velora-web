"use client";

import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { logout } from "@/lib/auth/actions";
import { NAV_ITEMS, isActive } from "./nav-items";

/** Barra inferior del móvil: cuatro secciones principales y "Más" con el resto y el cierre de sesión. */
export function BottomNav() {
  const t = useTranslations();
  const pathname = usePathname();
  // "Más" queda abierto solo en la ruta donde se abrió: navegar lo cierra sin efectos.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const secondary = NAV_ITEMS.filter((item) => !item.primary);
  const moreActive = secondary.some((item) => isActive(item.href, pathname));

  return (
    <nav
      aria-label={t("shell.primaryNav")}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-linea bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {open && (
        <div id="mas-secciones" className="border-b border-linea px-4 py-3">
          <ul aria-label={t("shell.moreNav")} className="flex flex-col gap-1">
            {secondary.map(({ key, href, icon: Icon }) => (
              <li key={key}>
                <Link
                  href={href}
                  aria-current={isActive(href, pathname) ? "page" : undefined}
                  className="flex items-center gap-3 rounded-md px-3 py-2 font-medium aria-[current=page]:bg-superficie-hundida"
                >
                  <Icon aria-hidden size={20} strokeWidth={1.75} />
                  {t(`nav.${key}`)}
                </Link>
              </li>
            ))}
            <li>
              <form action={logout}>
                <button type="submit" className="w-full rounded-md px-3 py-2 text-left font-medium text-tinta-suave">
                  {t("session.logout")}
                </button>
              </form>
            </li>
          </ul>
        </div>
      )}
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.filter((item) => item.primary).map(({ key, href, icon: Icon }) => {
          const active = isActive(href, pathname);
          return (
            <li key={key}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative flex flex-col items-center gap-0.5 px-1 pt-2.5 pb-2 text-xs font-medium ${
                  active ? "text-tinta" : "text-tinta-suave"
                }`}
              >
                {active && <span aria-hidden className="absolute inset-x-4 top-0 h-1 rounded-b-full bg-acento-medio" />}
                <Icon aria-hidden size={22} strokeWidth={1.75} />
                {t(`nav.${key}`)}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mas-secciones"
            onClick={() => setOpenAt(open ? null : pathname)}
            className={`relative flex w-full flex-col items-center gap-0.5 px-1 pt-2.5 pb-2 text-xs font-medium ${
              moreActive || open ? "text-tinta" : "text-tinta-suave"
            }`}
          >
            {moreActive && <span aria-hidden className="absolute inset-x-4 top-0 h-1 rounded-b-full bg-acento-medio" />}
            <Ellipsis aria-hidden size={22} strokeWidth={1.75} />
            {t("shell.more")}
          </button>
        </li>
      </ul>
    </nav>
  );
}
