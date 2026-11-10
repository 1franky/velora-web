import { getTranslations } from "next-intl/server";
import { logout } from "@/lib/auth/actions";
import { api } from "@/lib/auth/session";

/** Cuenta y cierre de sesión en el riel lateral. Lee la sesión: va detrás de <Suspense>. */
export async function UserMenu() {
  const t = await getTranslations();
  const { data } = await (await api()).GET("/me");
  return (
    <section aria-label={t("shell.account")} className="flex flex-col gap-2 border-t border-linea pt-4">
      {data && <p className="truncate text-sm text-tinta-suave">{data.email}</p>}
      <form action={logout}>
        <button
          type="submit"
          className="w-full rounded-md border border-linea px-3 py-1.5 text-sm font-medium hover:bg-superficie-hundida"
        >
          {t("session.logout")}
        </button>
      </form>
    </section>
  );
}
