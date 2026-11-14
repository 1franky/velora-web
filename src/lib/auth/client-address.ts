import { isIP } from "node:net";

/**
 * IP del navegador para reenviarla a la API en X-Forwarded-For, de modo que el límite de intentos de login cuente
 * por cliente y no por el contenedor web.
 *
 * El acceso público entra por el túnel de Cloudflare, que fija `cf-connecting-ip` (el navegador no puede
 * falsificarlo) y agrega la IP real al final de `x-forwarded-for`; lo que el cliente ponga antes se ignora. Solo se
 * devuelve una IP válida: cualquier otro valor se descarta en lugar de reenviarse.
 */
export function clientAddress(headers: Headers): string | undefined {
  const fromCloudflare = headers.get("cf-connecting-ip")?.trim();
  if (fromCloudflare && isIP(fromCloudflare)) {
    return fromCloudflare;
  }
  const lastForwarded = headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  if (lastForwarded && isIP(lastForwarded)) {
    return lastForwarded;
  }
  return undefined;
}
