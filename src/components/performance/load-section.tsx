import { getTranslations } from "next-intl/server";
import Link from "next/link";
import type { TrainingLoad } from "@/lib/performance/data";
import { LoadView } from "./load-view";

/**
 * Carga de entrenamiento semanal (edwards-trimp/1, ADR-020): siempre presentada como estimación, con su método en
 * palabras y sin valoraciones de riesgo (§12).
 */
export async function LoadSection({ data }: { data: TrainingLoad }) {
  const t = await getTranslations("performance.load");
  return (
    <section aria-labelledby="carga-titulo" className="flex flex-col gap-3">
      <h2 id="carga-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      {data.maxHeartRateBpm == null ? (
        <p className="max-w-prose">
          {t("noMaximum")}{" "}
          <Link
            href="/configuracion#frecuencia-cardiaca"
            className="font-semibold text-acento underline underline-offset-4"
          >
            {t("setMaximum")}
          </Link>
        </p>
      ) : (
        <LoadView weeks={data.weeks} />
      )}
      <p className="max-w-prose text-sm text-tinta-suave">{t("method")}</p>
    </section>
  );
}
