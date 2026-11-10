"use client";

import { useTranslations } from "next-intl";
import { useId, type ReactNode } from "react";
import type { FieldError } from "@/lib/catalog/forms";

const control =
  "rounded-md border border-linea bg-superficie px-3 py-2 text-base aria-invalid:border-negativo aria-invalid:outline-negativo";

type Common = { name: string; label: string; error?: FieldError; hint?: string };

/** Etiqueta, control y error enlazados (aria-describedby / aria-invalid). */
function Field({
  label,
  error,
  hint,
  children,
}: Omit<Common, "name"> & { children: (ids: { id: string; describedBy?: string }) => ReactNode }) {
  const t = useTranslations("forms.errors");
  const id = useId();
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      <label htmlFor={id}>{label}</label>
      {children({ id, describedBy })}
      {hint && (
        <span id={`${id}-hint`} className="font-normal text-tinta-suave">
          {hint}
        </span>
      )}
      {error && (
        <span id={`${id}-error`} className="font-medium text-negativo">
          {t(error)}
        </span>
      )}
    </div>
  );
}

export function TextField({
  name,
  label,
  error,
  hint,
  defaultValue,
  maxLength,
  required,
  inputMode,
}: Common & { defaultValue?: string | number | null; maxLength?: number; required?: boolean; inputMode?: "decimal" }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <input
          id={id}
          name={name}
          defaultValue={defaultValue ?? ""}
          maxLength={maxLength}
          required={required}
          inputMode={inputMode}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={control}
        />
      )}
    </Field>
  );
}

export function SelectField({
  name,
  label,
  error,
  hint,
  defaultValue,
  onChange,
  children,
}: Common & { defaultValue?: string; onChange?: (value: string) => void; children: ReactNode }) {
  return (
    <Field label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <select
          id={id}
          name={name}
          defaultValue={defaultValue}
          onChange={onChange ? (event) => onChange(event.currentTarget.value) : undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={control}
        >
          {children}
        </select>
      )}
    </Field>
  );
}
