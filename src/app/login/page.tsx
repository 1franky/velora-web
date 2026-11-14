import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: t("title") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("login");
  return (
    <main id="contenido" className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 p-8">
      <p aria-hidden className="font-display text-5xl font-bold tracking-tight">
        Velora
      </p>
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-tinta-suave">{t("subtitle")}</p>
      </header>
      <Suspense>
        <NextField searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** El parámetro `next` es un dato de la solicitud: se lee detrás de Suspense (Cache Components). */
async function NextField({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const next = params.next;
  const t = await getTranslations("login");
  return (
    <>
      {params.cuenta === "borrada" && (
        <p role="status" className="rounded-md border border-linea bg-superficie p-3 text-sm">
          {t("accountDeleted")}
        </p>
      )}
      <LoginForm next={typeof next === "string" ? next : ""} />
    </>
  );
}
