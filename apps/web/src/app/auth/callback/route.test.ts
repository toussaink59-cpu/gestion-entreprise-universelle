import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { GET } from "./route";

describe("authentication callback locale persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://polygest.example");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("persists the locale captured by the email confirmation link", async () => {
    const eq = vi.fn().mockResolvedValue({ error: null });
    const update = vi.fn().mockReturnValue({ eq });
    const from = vi.fn().mockReturnValue({ update });
    const exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: { user: { id: "confirmed-user-123" } },
      error: null,
    });

    createClientMock.mockResolvedValue({
      auth: { exchangeCodeForSession },
      from,
    });

    const request = new NextRequest(
      "https://polygest.example/auth/callback?code=confirmation-code&locale=en&next=%2Fonboarding",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://polygest.example/en/onboarding",
    );
    expect(from).toHaveBeenCalledWith("users");
    expect(update).toHaveBeenCalledWith({ preferred_locale: "en" });
    expect(eq).toHaveBeenCalledWith("id", "confirmed-user-123");
  });

  it("does not attempt a profile update when the callback has no code", async () => {
    const request = new NextRequest(
      "https://polygest.example/auth/callback?locale=en&next=%2Fonboarding",
    );
    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://polygest.example/en/login?error=confirmation-failed",
    );
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
