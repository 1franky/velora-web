/** Preferencia de tema guardada solo en este navegador (no es un dato de la cuenta). */
export const THEME_STORAGE_KEY = "velora-tema";

export type ThemePreference = "system" | "light" | "dark";

/**
 * Script en línea que aplica el tema antes del primer pintado (evita el destello). Debe ser autocontenido y
 * tolerar un almacenamiento bloqueado.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t}}catch(e){}})();`;

const CHANGE_EVENT = "velora-tema";

/** Suscripción para useSyncExternalStore: cambios en esta pestaña y en otras. */
export function subscribeTheme(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === "system") {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preference;
  }
  try {
    if (preference === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {
    // Almacenamiento no disponible (modo privado): el tema se aplica solo en esta visita.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}
