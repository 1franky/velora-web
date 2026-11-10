import { describe, expect, it } from "vitest";
import {
  MISSING,
  formatDistance,
  formatDuration,
  formatElevation,
  formatFileSize,
  formatInstantDate,
  formatInstantTime,
  formatLocalDate,
  formatSpeed,
  formatWeekdayDate,
} from "./units";

describe("formatos es-MX", () => {
  it("convierte metros a kilómetros con un decimal y separador de miles", () => {
    expect(formatDistance(42_350)).toBe("42.4 km");
    expect(formatDistance(1_234_567)).toBe("1,234.6 km");
  });

  it("muestra desnivel en metros sin decimales", () => {
    expect(formatElevation(920.4)).toBe("920 m");
  });

  it("convierte m/s a km/h", () => {
    expect(formatSpeed(3.92)).toBe("14.1 km/h");
  });

  it("formatea duraciones como h:mm:ss, incluidas las de más de un día", () => {
    expect(formatDuration(10_800)).toBe("3:00:00");
    expect(formatDuration(3_725)).toBe("1:02:05");
    expect(formatDuration(45)).toBe("0:00:45");
    expect(formatDuration(30 * 3600 + 61)).toBe("30:01:01");
  });

  it("formatea la fecha local como dd/MM/yyyy sin desplazar el día", () => {
    expect(formatLocalDate("2026-11-08")).toBe("08/11/2026");
    expect(formatLocalDate("2026-01-01")).toBe("01/01/2026");
  });

  it("nunca convierte un dato ausente en cero", () => {
    expect(formatDistance(null)).toBe(MISSING);
    expect(formatElevation(undefined)).toBe(MISSING);
    expect(formatSpeed(null)).toBe(MISSING);
    expect(formatDuration(null)).toBe(MISSING);
    expect(formatLocalDate(null)).toBe(MISSING);
    expect(formatDistance(0)).toBe("0.0 km");
  });

  it("muestra la fecha con día de la semana, sin puntos de abreviatura", () => {
    const text = formatWeekdayDate("2026-11-09");
    expect(text).toMatch(/^lun,? 9 (de )?nov (de )?2026$/);
    expect(formatWeekdayDate(null)).toBe(MISSING);
  });

  it("muestra tamaños de archivo en kB o MB", () => {
    expect(formatFileSize(12.34 * 1024 * 1024)).toBe("12.3 MB");
    expect(formatFileSize(9_000)).toBe("9 kB");
    expect(formatFileSize(10)).toBe("1 kB");
  });

  it("muestra la fecha de un instante en la zona de la actividad", () => {
    expect(formatInstantDate("2026-11-10T03:30:00Z", "America/Mexico_City")).toBe("09/11/2026");
    expect(formatInstantDate("no-es-fecha", "America/Mexico_City")).toBe(MISSING);
  });

  it("muestra la hora local de un instante en 24 horas", () => {
    expect(formatInstantTime("2026-11-08T14:05:00Z", "America/Mexico_City")).toBe("08:05");
    expect(formatInstantTime("x", "America/Mexico_City")).toBe(MISSING);
  });
});
