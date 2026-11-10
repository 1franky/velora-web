"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, type ReactNode } from "react";
import { IDLE, type FormState } from "@/lib/catalog/form-state";

type Props = {
  triggerLabel: string;
  triggerClassName: string;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  fields: Record<string, string>;
};

/**
 * Confirmación de una acción destructiva con <dialog> nativo (modal accesible: atrapa el foco y cierra con Esc),
 * nunca con confirm() del navegador. El foco inicial va a "Cancelar": la opción segura. Se cierra solo si la acción
 * termina bien (las que redirigen no vuelven aquí).
 */
export function ConfirmDialog({
  triggerLabel,
  triggerClassName,
  title,
  children,
  confirmLabel,
  pendingLabel,
  action,
  fields,
}: Props) {
  const t = useTranslations("confirm");
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [state, formAction, pending] = useActionState(action, IDLE);

  useEffect(() => {
    if (state.status === "ok") dialog.current?.close();
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={triggerClassName}>
        {triggerLabel}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(32rem,calc(100%-2rem))] rounded-lg border border-linea bg-superficie p-6 text-tinta backdrop:bg-black/50"
      >
        <form action={formAction} className="flex flex-col gap-4">
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id={titleId} className="text-2xl font-semibold">
            {title}
          </h2>
          <div className="flex flex-col gap-2 text-tinta-suave">{children}</div>
          {state.status === "error" && (
            <p role="alert" className="font-medium text-negativo">
              {state.detail ?? t(`errors.${state.error ?? "invalid"}`)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              autoFocus
              onClick={() => dialog.current?.close()}
              className="rounded-md border border-linea px-4 py-2 font-semibold hover:bg-superficie-hundida"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-negativo px-4 py-2 font-semibold text-sobre-negativo hover:brightness-110 disabled:opacity-60"
            >
              {pending ? pendingLabel : confirmLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
