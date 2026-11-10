"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type ReactNode } from "react";

/**
 * En móvil los filtros ocupan una pantalla entera: se pliegan detrás de un botón (abiertos si hay filtros activos).
 * En pantallas medianas y grandes siempre están visibles.
 */
export function FiltersPanel({ active, children }: { active: number; children: ReactNode }) {
  const t = useTranslations("activities.filters");
  const [open, setOpen] = useState(active > 0);
  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="filtros"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 self-start rounded-md border border-linea bg-superficie px-4 py-2 font-semibold md:hidden"
      >
        <SlidersHorizontal aria-hidden size={18} strokeWidth={2} />
        {active > 0 ? t("toggleActive", { count: active }) : t("toggle")}
      </button>
      <div id="filtros" className={open ? "block" : "hidden md:block"}>
        {children}
      </div>
    </div>
  );
}
