import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, cookiesMock, redirectMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  cookiesMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: cookiesMock }));
vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { setLocalePreference } from "@/app/auth/locale-actions";

function makeForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

function expectRedirect(action: Promise<unknown>, path: string) {
  return expect(action).rejects.toThrow("REDIRECT:" + path);
}

describe("locale preference server action", () => {
  const cookieSet = vi.fn();
  const getUser = vi.fn();
  const update = vi.fn();
  const eq = vi.fn();
  const from = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new Error("REDIRECT:" + path);
    });
    cookiesMock.mockResolvedValue({ set: cookieSet });
    update.mockReturnValue({ eq });
    eq.mockResolvedValue({ error: null });
    from.mockReturnValue({ update });
    createClientMock.mockResolvedValue({ auth: { getUser }, from });
  });

  it("persists the language for the authenticated profile and sets a secure-by-default cookie", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    const form = makeForm({ locale: "en", route: "/login" });

    await expectRedirect(setLocalePreference(form), "/en/login");

    expect(from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({ preferred_locale: "en" });
    expect(eq).toHaveBeenCalledWith("id", "user-1");
    expect(cookieSet).toHaveBeenCalledWith("polygest-locale", "en", {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  });

  it("sets the visitor cookie without attempting a database update", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const form = makeForm({ locale: "en", route: "/register" });

    await expectRedirect(setLocalePreference(form), "/en/register");

    expect(cookieSet).toHaveBeenCalledWith("polygest-locale", "en", expect.any(Object));
    expect(from).not.toHaveBeenCalled();
  });

  it("uses the explicit French route when switching from the English workspace notice", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const form = makeForm({ locale: "fr", route: "/workspace-language-notice" });

    await expectRedirect(setLocalePreference(form), "/fr/workspace-language-notice");
  });

  it("rejects unsupported locales and forged return paths before contacting Supabase", async () => {
    const form = makeForm({ locale: "de", route: "https://attacker.example" });

    await expectRedirect(setLocalePreference(form), "/login?error=invalid-locale-selection");

    expect(cookiesMock).not.toHaveBeenCalled();
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
