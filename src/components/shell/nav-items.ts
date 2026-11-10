import { Activity, Gauge, House, Map, Route, Settings, Target, type LucideIcon } from "lucide-react";

export type NavKey = "inicio" | "actividades" | "explorador" | "rutas" | "rendimiento" | "objetivos" | "configuracion";

export type NavItem = { key: NavKey; href: string; icon: LucideIcon; primary: boolean };

/** Navegación de 06-web-application.md §2. Las principales también van en la barra inferior del móvil. */
export const NAV_ITEMS: readonly NavItem[] = [
  { key: "inicio", href: "/", icon: House, primary: true },
  { key: "actividades", href: "/actividades", icon: Activity, primary: true },
  { key: "explorador", href: "/explorador", icon: Map, primary: true },
  { key: "rendimiento", href: "/rendimiento", icon: Gauge, primary: true },
  { key: "rutas", href: "/rutas", icon: Route, primary: false },
  { key: "objetivos", href: "/objetivos", icon: Target, primary: false },
  { key: "configuracion", href: "/configuracion", icon: Settings, primary: false },
];

export function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
