import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, redirectMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { requestPasswordReset, updatePassword } from "@/app/auth/actions";

function makeForm(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) form.set(key, value);
  return form;
}

function expectRedirect(action: Promise<unknown>, path: string) {
  return expect(action).rejects.toThrow("REDIRECT:" + path);
}

describe("password recovery server actions", () => {
  const resetPasswordForEmail = vi.fn();
  const getUser = vi.fn();
  const updateUser = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://polygest.example/path";
    redirectMock.mockImplementation((path: string) => {
      throw new Error("REDIRECT:" + path);
    });
    createClientMock.mockResolvedValue({
      auth: { resetPasswordForEmail, getUser, updateUser },
    });
  });

  it("sends a PKCE recovery request to the localized callback", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: null });
    const form = makeForm({ locale: "en", email: " User@Example.com " });

    await expectRedirect(requestPasswordReset(form), "/en/forgot-password?message=check-email");

    expect(resetPasswordForEmail).toHaveBeenCalledWith("user@example.com", {
      redirectTo: "https://polygest.example/auth/callback?next=%2Freset-password&locale=en",
    });
  });

  it("shows the same public response when Supabase declines or throttles the request", async () => {
    resetPasswordForEmail.mockResolvedValue({ error: { code: "over_email_send_rate_limit", status: 429 } });
    const form = makeForm({ locale: "fr", email: "user@example.com" });

    await expectRedirect(requestPasswordReset(form), "/forgot-password?message=check-email");
  });

  it("rejects malformed email addresses before contacting Supabase", async () => {
    const form = makeForm({ locale: "fr", email: "not-an-email" });
    await expectRedirect(requestPasswordReset(form), "/forgot-password?error=invalid-email");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("requires an authenticated recovery session before updating a password", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const form = makeForm({ locale: "en", password: "SecurePass123", confirm_password: "SecurePass123" });

    await expectRedirect(updatePassword(form), "/en/reset-password?error=invalid-session");
    expect(updateUser).not.toHaveBeenCalled();
  });

  it("rejects mismatched passwords before contacting Supabase", async () => {
    const form = makeForm({ locale: "fr", password: "SecurePass123", confirm_password: "DifferentPass123" });

    await expectRedirect(updatePassword(form), "/reset-password?error=password-mismatch");
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it("updates the password only after the authenticated user has been verified", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    updateUser.mockResolvedValue({ error: null });
    const form = makeForm({ locale: "en", password: "SecurePass123", confirm_password: "SecurePass123" });

    await expectRedirect(updatePassword(form), "/en/reset-password?success=updated");
    expect(updateUser).toHaveBeenCalledWith({ password: "SecurePass123" });
  });
});
