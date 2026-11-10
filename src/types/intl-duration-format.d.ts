// Intl.DurationFormat (ES2025) está en Node 26 y navegadores actuales, pero TypeScript 5.9 aún no lo tipa.
// Declaración mínima de lo que usamos; eliminar al actualizar a una versión de TypeScript que lo incluya.
declare namespace Intl {
  interface DurationFormatOptions {
    style?: "long" | "short" | "narrow" | "digital";
    hoursDisplay?: "always" | "auto";
  }

  interface DurationInput {
    hours?: number;
    minutes?: number;
    seconds?: number;
  }

  class DurationFormat {
    constructor(locale?: string, options?: DurationFormatOptions);
    format(duration: DurationInput): string;
  }
}
