import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("login");
  return { title: `${t("title")} · Velora` };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const t = await getTranslations("login");
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="opacity-80">{t("subtitle")}</p>
      </header>
      <Suspense>
        <NextField searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

/** El parámetro `next` es un dato de la solicitud: se lee detrás de Suspense (Cache Components). */
async function NextField({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const next = (await searchParams).next;
  return <LoginForm next={typeof next === "string" ? next : ""} />;
}
