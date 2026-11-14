/** Motivo por el que no se pudo descargar la exportación; se muestra en Configuración (`?datos=`). */
export type ExportFailure = "en-curso" | "sesion" | "error";

export const EXPORT_FAILURES: readonly ExportFailure[] = ["en-curso", "sesion", "error"];

export function exportFailure(status: number): ExportFailure {
  if (status === 409) return "en-curso";
  if (status === 401) return "sesion";
  return "error";
}

export function isExportFailure(value: unknown): value is ExportFailure {
  return typeof value === "string" && (EXPORT_FAILURES as readonly string[]).includes(value);
}
