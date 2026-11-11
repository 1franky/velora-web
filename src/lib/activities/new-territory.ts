import type { components } from "@/lib/api/schema";

/**
 * Caminos nuevos de la actividad abierta (ADR-019), compartidos entre el panel que los pide y el mapa que los dibuja:
 * una sola consulta a la API. Mismo patrón que `hoverPosition`.
 */
export type NewTerritory = components["schemas"]["NewTerritory"];

let current: NewTerritory | null = null;
const listeners = new Set<() => void>();

export const newTerritory = {
  get: (): NewTerritory | null => current,
  set(value: NewTerritory | null) {
    current = value;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
