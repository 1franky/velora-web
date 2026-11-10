import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { logout } from "@/lib/auth/actions";
import { api } from "@/lib/auth/session";

export default async function HomePage() {
  const t = await getTranslations("home");
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-4 p-8">
      <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
      <Suspense fallback={<p>{t("loadingUser")}</p>}>
        <CurrentUser />
      </Suspense>
      <p className="text-base opacity-80">{t("status")}</p>
    </main>
  );
}

/** Lee la sesión (cookie) y consulta /me: va detrás de Suspense para no bloquear el resto de la página. */
async function CurrentUser() {
  const [t, ts] = await Promise.all([getTranslations("home"), getTranslations("session")]);
  const { data } = await (await api()).GET("/me");
  if (!data) {
    return <p role="alert">{ts("unavailable")}</p>;
  }
  return (
    <div className="flex items-center gap-4">
      <p className="text-lg">{t("greeting", { email: data.email })}</p>
      <form action={logout}>
        <button type="submit" className="rounded-md border border-current/40 px-3 py-1 text-sm">
          {ts("logout")}
        </button>
      </form>
    </div>
  );
}
