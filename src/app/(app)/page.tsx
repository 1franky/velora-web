import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { api } from "@/lib/auth/session";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-3 px-6 py-10 lg:px-10 lg:py-14">
      <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<p className="text-tinta-suave">{t("loadingUser")}</p>}>
        <Greeting />
      </Suspense>
      <p className="max-w-prose text-tinta-suave">{t("summarySoon")}</p>
    </div>
  );
}

/** Lee la sesión y consulta /me: va detrás de Suspense para no bloquear el resto de la página. */
async function Greeting() {
  const [t, ts] = await Promise.all([getTranslations("home"), getTranslations("session")]);
  const { data } = await (await api()).GET("/me");
  if (!data) {
    return (
      <p role="alert" className="text-negativo">
        {ts("unavailable")}
      </p>
    );
  }
  return <p className="text-xl">{t("greeting", { email: data.email })}</p>;
}
