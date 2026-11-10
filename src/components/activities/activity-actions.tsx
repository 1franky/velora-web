"use client";

import { RefreshCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  activityRecalculated,
  deleteActivityAction,
  reprocessActivityAction,
} from "@/app/(app)/actividades/[id]/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { pollJob } from "@/lib/imports/poll";

type Reprocess = "idle" | "working" | "done" | "failed" | "session" | "unavailable";

const secondary =
  "inline-flex items-center gap-2 rounded-md border border-linea bg-superficie px-4 py-2 font-semibold hover:bg-superficie-hundida disabled:opacity-60";

/** Recalcular desde el archivo original (asíncrono, con seguimiento) y borrar con confirmación. */
export function ActivityActions({ activityId, title }: { activityId: string; title: string }) {
  const t = useTranslations("activityActions");
  const router = useRouter();
  const [reprocess, setReprocess] = useState<Reprocess>("idle");

  async function recalculate() {
    setReprocess("working");
    const started = await reprocessActivityAction(activityId);
    if (!started.ok) {
      setReprocess(started.error === "session" ? "session" : "unavailable");
      return;
    }
    const result = await pollJob(started.jobId);
    if (!result.ok) {
      setReprocess(result.error);
      return;
    }
    if (result.job.status !== "COMPLETED") {
      setReprocess("failed");
      return;
    }
    await activityRecalculated();
    router.refresh();
    setReprocess("done");
  }

  return (
    <section aria-labelledby="acciones-titulo" className="flex flex-col gap-3 border-t border-linea pt-6">
      <h2 id="acciones-titulo" className="text-2xl font-semibold">
        {t("title")}
      </h2>
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={recalculate} disabled={reprocess === "working"} className={secondary}>
          <RefreshCw
            aria-hidden
            size={18}
            strokeWidth={2}
            className={reprocess === "working" ? "animate-spin motion-reduce:animate-none" : undefined}
          />
          {reprocess === "working" ? t("recalculating") : t("recalculate")}
        </button>
        <ConfirmDialog
          triggerLabel={t("delete")}
          triggerClassName="rounded-md border border-negativo px-4 py-2 font-semibold text-negativo hover:bg-superficie-hundida"
          title={t("deleteTitle", { title })}
          confirmLabel={t("deleteConfirm")}
          pendingLabel={t("deleting")}
          action={deleteActivityAction}
          fields={{ activityId }}
        >
          <p>{t("deleteBody")}</p>
          <p className="font-medium text-tinta">{t("deleteIrreversible")}</p>
        </ConfirmDialog>
      </div>
      <p role="status" className="min-h-6 text-sm text-tinta-suave">
        {reprocess === "idle" || reprocess === "working" ? t("recalculateHint") : t(`reprocess.${reprocess}`)}
      </p>
    </section>
  );
}
