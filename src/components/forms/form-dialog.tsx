"use client";

import { useTranslations } from "next-intl";
import { useActionState, useEffect, useId, useRef, type ReactNode } from "react";
import { IDLE, type FormState } from "@/lib/catalog/form-state";

type Props = {
  triggerLabel: string;
  triggerClassName: string;
  title: string;
  submitLabel: string;
  pendingLabel: string;
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  hidden?: Record<string, string>;
  /** Campos del formulario; reciben el estado para mostrar los errores de cada uno. */
  children: (state: FormState) => ReactNode;
};

/**
 * Formulario en un <dialog> modal (agregar o editar). Se cierra y se reinicia al guardar; con errores, el foco va al
 * primer campo inválido.
 */
export function FormDialog({
  triggerLabel,
  triggerClassName,
  title,
  submitLabel,
  pendingLabel,
  action,
  hidden,
  children,
}: Props) {
  const t = useTranslations("confirm");
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const [state, formAction, pending] = useActionState(action, IDLE);

  useEffect(() => {
    if (state.status === "ok") {
      dialog.current?.close();
      form.current?.reset();
    } else if (state.status === "error") {
      form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
    }
  }, [state]);

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()} className={triggerClassName}>
        {triggerLabel}
      </button>
      <dialog
        ref={dialog}
        aria-labelledby={titleId}
        className="m-auto w-[min(36rem,calc(100%-2rem))] rounded-lg border border-linea bg-superficie p-6 text-tinta backdrop:bg-black/50"
      >
        <form ref={form} action={formAction} noValidate className="flex flex-col gap-4">
          {Object.entries(hidden ?? {}).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <h2 id={titleId} className="text-2xl font-semibold">
            {title}
          </h2>
          {children(state)}
          {state.status === "error" && !state.fields && (
            <p role="alert" className="font-medium text-negativo">
              {state.detail ?? t(`errors.${state.error ?? "invalid"}`)}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="rounded-md border border-linea px-4 py-2 font-semibold hover:bg-superficie-hundida"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-acento px-4 py-2 font-semibold text-acento-texto-sobre hover:brightness-110 disabled:opacity-60"
            >
              {pending ? pendingLabel : submitLabel}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
