import { Copy } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getPossibleDuplicates } from "@/lib/activities/data";
import { formatDistance, formatWeekdayDate } from "@/lib/format/units";

/**
 * Aviso de posibles duplicados (misma regla que al importar). Si la consulta falla no se muestra nada: es una ayuda,
 * no bloquea el detalle.
 */
export async function DuplicatesNotice({ activityId }: { activityId: string }) {
  const [result, t] = await Promise.all([getPossibleDuplicates(activityId), getTranslations("duplicates")]);
  if (!result.ok || result.data.length === 0) {
    return null;
  }
  return (
    <aside
      aria-labelledby="duplicados-titulo"
      className="flex gap-3 rounded-lg border border-acento-medio bg-superficie p-4"
    >
      <Copy aria-hidden size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-acento" />
      <div className="flex flex-col gap-2">
        <h2 id="duplicados-titulo" className="font-semibold">
          {t("title", { count: result.data.length })}
        </h2>
        <p className="text-sm text-tinta-suave">{t("body")}</p>
        <ul className="flex flex-col gap-1">
          {result.data.map((other) => (
            <li key={other.id} className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-medium">{other.title}</span>
              <span className="cifras text-sm text-tinta-suave">
                {formatWeekdayDate(other.localStartDate)}, {formatDistance(other.distanceMeters)}
              </span>
              <Link
                href={`/actividades/comparar?a=${activityId}&b=${other.id}`}
                className="text-sm font-semibold text-acento underline underline-offset-4"
              >
                {t("compare", { title: other.title })}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
