import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidAccessToken, resetVerifiedTokens } from "./verify";

const ok = () => new Response("{}", { status: 200 });
const unauthorized = () => new Response("{}", { status: 401 });

beforeEach(() => resetVerifiedTokens());

describe("isValidAccessToken", () => {
  it("sin token no consulta la API", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    expect(await isValidAccessToken(undefined, "http://api", fetchImpl)).toBe(false);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("valida con /me y recuerda la respuesta un minuto", async () => {
    let clock = 0;
    const fetchImpl = vi.fn<typeof fetch>().mockImplementation(async () => ok());

    expect(await isValidAccessToken("t", "http://api/", fetchImpl, () => clock)).toBe(true);
    clock = 59_000;
    expect(await isValidAccessToken("t", "http://api/", fetchImpl, () => clock)).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe("http://api/api/v1/me");
    expect(fetchImpl.mock.calls[0][1]?.headers).toEqual({ Authorization: "Bearer t" });

    clock = 61_000;
    await isValidAccessToken("t", "http://api/", fetchImpl, () => clock);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("no recuerda tokens rechazados ni fallos de red", async () => {
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(unauthorized())
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(ok());

    expect(await isValidAccessToken("t", "http://api", fetchImpl)).toBe(false);
    expect(await isValidAccessToken("t", "http://api", fetchImpl)).toBe(false);
    expect(await isValidAccessToken("t", "http://api", fetchImpl)).toBe(true);
  });
});
