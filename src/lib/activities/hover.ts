/**
 * Punto señalado en las gráficas del detalle, compartido con el mapa para marcarlo. Estado del navegador, sin
 * dependencias: las gráficas publican y el mapa se suscribe (useSyncExternalStore o un listener directo).
 */
export type HoverPosition = [longitude: number, latitude: number] | null;

let current: HoverPosition = null;
const listeners = new Set<() => void>();

export const hoverPosition = {
  get: (): HoverPosition => current,
  set(position: HoverPosition) {
    if (position === current || (position && current && position[0] === current[0] && position[1] === current[1])) {
      return;
    }
    current = position;
    listeners.forEach((listener) => listener());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};
