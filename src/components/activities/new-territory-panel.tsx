"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { newTerritory, type NewTerritory } from "@/lib/activities/new-territory";
import { formatDistance } from "@/lib/format/units";

type State = { status: "cargando" } | { status: "listo"; data: NewTerritory } | { status: "error" };

/**
 * Caminos nuevos de esta rodada (ADR-019): cuánto recorriste por primera vez y con qué confianza. Comparte el
 * resultado con el mapa, que dibuja los tramos. Si la consulta falla no se muestra nada: es una ayuda.
 */
export function NewTerritoryPanel({ activityId }: { activityId: string }) {
  const t = useTranslations("newTerritory");
  const [state, setState] = useState<State>({ status: "cargando" });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/actividades/${activityId}/caminos-nuevos`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const data = (await response.json()) as NewTerritory;
        if (cancelled) return;
        newTerritory.set(data);
        setState({ status: "listo", data });
      })
      .catch(() => !cancelled && setState({ status: "error" }));
    return () => {
      cancelled = true;
      newTerritory.set(null);
    };
  }, [activityId]);

  if (state.status === "error") return null;
  if (state.status === "cargando") {
    return <div aria-hidden className="h-20 animate-pulse rounded-lg bg-superficie-hundida" />;
  }
  const { data } = state;
  const percent = new Intl.NumberFormat("es-MX", { style: "percent", maximumFractionDigits: 0 }).format(
    data.newFraction,
  );
  const headline = data.firstActivity
    ? t("first")
    : data.newDistanceMeters === 0
      ? t("none")
      : t("some", { distance: formatDistance(data.newDistanceMeters), percent });
  const drawn = !data.firstActivity && data.geometry !== null;
  return (
    <section
      aria-labelledby="caminos-nuevos-titulo"
      data-confianza={data.confidence}
      className="flex gap-3 rounded-lg border border-linea bg-superficie p-4"
    >
      <Sparkles aria-hidden size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-camino-nuevo" />
      <div className="flex flex-col gap-1">
        <h2 id="caminos-nuevos-titulo" className="font-semibold">
          {t("title")}
        </h2>
        <p className="cifras text-lg font-semibold">{headline}</p>
        {!data.firstActivity && (
          <p className="text-sm text-tinta-suave">
            {t(`confidence.${data.confidence}`)} {t("compared", { count: data.comparedActivities })}
          </p>
        )}
        {drawn && (
          <p className="flex items-center gap-2 text-sm text-tinta-suave">
            <span aria-hidden className="inline-block h-1 w-6 rounded-full bg-camino-nuevo" />
            {t("legend")}
          </p>
        )}
        {data.trimmed && <p className="text-sm text-tinta-suave">{t("trimmed")}</p>}
      </div>
    </section>
  );
}
