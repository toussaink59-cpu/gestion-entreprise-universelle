import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, redirectMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { signIn, signUp } from "./actions";

function makeForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

function expectRedirect(action: Promise<unknown>, path: string) {
  return expect(action).rejects.toThrow("REDIRECT:" + path);
}

function makeClient(auth: Record<string, unknown>) {
  const eq = vi.fn().mockResolvedValue({ error: null });
  const update = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ update });

  return {
    client: { auth, from },
    eq,
    from,
    update,
  };
}

describe("authenticated locale persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redirectMock.mockImplementation((path: string) => {
      throw new Error("REDIRECT:" + path);
    });
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://polygest.example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("persists the selected locale after a successful password sign-in", async () => {
    const signInWithPassword = vi.fn().mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });
    const { client, eq, from, update } = makeClient({ signInWithPassword });
    createClientMock.mockResolvedValue(client);

    const action = signIn(
      makeForm({
        locale: "en",
        email: "user@example.com",
        password: "valid-password",
      }),
    );

    await expectRedirect(
      action,
      "/en/workspace-language-notice?continue=%2Fdashboard",
    );

    expect(from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({ preferred_locale: "en" });
    expect(eq).toHaveBeenCalledWith("id", "user-123");
  });

  it("persists the selected locale when sign-up immediately creates a session", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: {
        session: { access_token: "test-session" },
        user: { id: "new-user-123" },
      },
      error: null,
    });
    const { client, eq, from, update } = makeClient({ signUp });
    createClientMock.mockResolvedValue(client);

    await expectRedirect(
      signUpAction(),
      "/en/onboarding",
    );

    expect(from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({ preferred_locale: "en" });
    expect(eq).toHaveBeenCalledWith("id", "new-user-123");
  });

  it("waits for the confirmation callback when sign-up does not create a session", async () => {
    const signUp = vi.fn().mockResolvedValue({
      data: { session: null, user: { id: "new-user-123" } },
      error: null,
    });
    const { client, from } = makeClient({ signUp });
    createClientMock.mockResolvedValue(client);

    await expectRedirect(
      signUpAction(),
      "/en/login?message=check-email",
    );

    expect(from).not.toHaveBeenCalled();
  });
});

async function signUpAction() {
  return signUp(
    makeForm({
      locale: "en",
      full_name: "Test User",
      email: "new-user@example.com",
      password: "strong-password-123",
    }),
  );
}
