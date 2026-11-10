"use client";

import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { setBikeActiveAction } from "@/app/(app)/configuracion/actions";
import { IDLE } from "@/lib/catalog/form-state";

/** Retirar conserva el historial: la bicicleta deja de ofrecerse al importar y editar. */
export function BikeActiveToggle({ bikeId, active, name }: { bikeId: string; active: boolean; name: string }) {
  const t = useTranslations("settings.bikes");
  const [state, action, pending] = useActionState(setBikeActiveAction, IDLE);
  return (
    <form action={action}>
      <input type="hidden" name="bikeId" value={bikeId} />
      <input type="hidden" name="active" value={String(!active)} />
      <button
        type="submit"
        disabled={pending}
        aria-label={active ? t("retireNamed", { name }) : t("reactivateNamed", { name })}
        className="rounded-md border border-linea px-3 py-1.5 text-sm font-semibold hover:bg-superficie-hundida disabled:opacity-60"
      >
        {active ? t("retire") : t("reactivate")}
      </button>
      {state.status === "error" && (
        <span role="alert" className="ml-2 text-sm text-negativo">
          {state.detail ?? t("error")}
        </span>
      )}
    </form>
  );
}
