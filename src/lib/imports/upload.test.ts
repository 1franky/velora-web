import { describe, expect, it, vi } from "vitest";
import { forwardImport, isSameOrigin, MAX_UPLOAD_BYTES, type UploadContext } from "./upload";

const SITE = "velora.local:3000";

function upload(headers: Record<string, string> = {}, body: BodyInit | null = "--x\r\n\r\ncontenido\r\n--x--") {
  return new Request(`http://${SITE}/api/importaciones`, {
    method: "POST",
    headers: {
      host: SITE,
      origin: `http://${SITE}`,
      "sec-fetch-site": "same-origin",
      "content-type": "multipart/form-data; boundary=x",
      ...headers,
    },
    body,
  });
}

function context(fetchImpl: typeof fetch, cookies: Record<string, string> = { "velora-access": "token" }) {
  return {
    cookie: (name: string) => cookies[name],
    apiBaseUrl: "http://api.local/",
    secure: false,
    fetchImpl,
  } satisfies UploadContext;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("isSameOrigin", () => {
  it("acepta solo el propio sitio", () => {
    expect(isSameOrigin(new Headers({ host: SITE, origin: `http://${SITE}` }))).toBe(true);
    expect(isSameOrigin(new Headers({ host: SITE, origin: "https://otro.example" }))).toBe(false);
    expect(isSameOrigin(new Headers({ host: SITE }))).toBe(false);
    expect(isSameOrigin(new Headers({ host: SITE, origin: "null" }))).toBe(false);
    expect(isSameOrigin(new Headers({ host: SITE, origin: `http://${SITE}`, "sec-fetch-site": "cross-site" }))).toBe(
      false,
    );
  });

  it("respeta el host reenviado por un proxy inverso", () => {
    expect(
      isSameOrigin(
        new Headers({ host: "127.0.0.1:3000", "x-forwarded-host": "velora.example", origin: "https://velora.example" }),
      ),
    ).toBe(true);
  });
});

describe("forwardImport", () => {
  it("reenvía el flujo multipart a la API con el access token y devuelve el trabajo", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(202, { jobId: "job-1", status: "QUEUED" }));

    const result = await forwardImport(upload(), context(fetchImpl));

    expect(result).toEqual({ status: 202, body: { jobId: "job-1" } });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("http://api.local/api/v1/activities/imports");
    expect(init?.headers).toEqual({
      "Content-Type": "multipart/form-data; boundary=x",
      Authorization: "Bearer token",
    });
    expect(init?.body).toBeInstanceOf(ReadableStream);
  });

  it("rechaza solicitudes de otro sitio sin llamar a la API", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    const result = await forwardImport(upload({ origin: "https://otro.example" }), context(fetchImpl));

    expect(result.status).toBe(403);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sin access token responde 401 y no intenta renovar (eso lo hace Proxy)", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    const result = await forwardImport(upload(), context(fetchImpl, { "velora-refresh": "r" }));

    expect(result).toEqual({ status: 401, body: { error: "session" } });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("corta archivos demasiado grandes antes de reenviarlos", async () => {
    const fetchImpl = vi.fn<typeof fetch>();

    const result = await forwardImport(upload({ "content-length": String(MAX_UPLOAD_BYTES + 1) }), context(fetchImpl));

    expect(result.status).toBe(413);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("exige multipart/form-data", async () => {
    const result = await forwardImport(upload({ "content-type": "application/json" }), context(vi.fn()));
    expect(result.status).toBe(400);
  });

  it.each([
    [401, { status: 401 }, 401, "session"],
    [413, { status: 413 }, 413, "tooLarge"],
    [500, { status: 500 }, 502, "unavailable"],
  ])("traduce un %i de la API", async (apiStatus, problem, status, error) => {
    const result = await forwardImport(
      upload(),
      context(vi.fn<typeof fetch>().mockResolvedValue(json(apiStatus, problem))),
    );
    expect(result).toEqual({ status, body: { error } });
  });

  it("conserva el detalle en es-MX de un 400 de la API", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(json(400, { status: 400, detail: "Falta el archivo." }));

    expect(await forwardImport(upload(), context(fetchImpl))).toEqual({
      status: 400,
      body: { error: "invalid", detail: "Falta el archivo." },
    });
  });

  it("si la API no responde, lo dice sin perder la sesión", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    expect(await forwardImport(upload(), context(fetchImpl))).toEqual({ status: 502, body: { error: "unavailable" } });
  });
});
