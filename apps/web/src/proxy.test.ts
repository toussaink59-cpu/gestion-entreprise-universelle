import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type FakeCookie = {
  name: string;
  value: string;
  options?: {
    httpOnly?: boolean;
    path?: string;
    sameSite?: "lax" | "strict" | "none";
  };
};

type SupabaseProxyOptions = {
  cookies: {
    setAll: (
      cookies: FakeCookie[],
      headers?: Record<string, string>,
    ) => void;
  };
};

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { proxy } from "./proxy";

const origin = "https://polygest.example";

function makeRequest(path: string, cookie?: string): NextRequest {
  return new NextRequest(new URL(path, origin), {
    headers: cookie ? { cookie } : undefined,
  });
}

function configureSupabase(options: {
  claims?: { sub?: string } | null;
  profile?: { preferred_locale?: string } | null;
  refresh?: {
    cookies: FakeCookie[];
    headers: Record<string, string>;
  };
}) {
  const maybeSingle = vi.fn().mockResolvedValue({
    data: options.profile ?? null,
    error: null,
  });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  let setAll:
    | SupabaseProxyOptions["cookies"]["setAll"]
    | undefined;

  const getClaims = vi.fn(async () => {
    if (options.refresh) {
      if (!setAll) throw new Error("Supabase cookie adapter was not initialized");
      setAll(options.refresh.cookies, options.refresh.headers);
    }

    return {
      data: { claims: options.claims ?? null },
      error: null,
    };
  });

  createServerClientMock.mockImplementation(
    (_url: string, _key: string, clientOptions: SupabaseProxyOptions) => {
      setAll = clientOptions.cookies.setAll;
      return {
        auth: { getClaims },
        from,
      };
    },
  );

  return { from, getClaims, maybeSingle };
}

describe("proxy locale and Supabase response handling", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "test-publishable-key",
    );
    createServerClientMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("redirects a visitor to the locale stored in the HTTP-only preference cookie", async () => {
    configureSupabase({ claims: null });

    const response = await proxy(
      makeRequest("/login", "polygest-locale=en"),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `${origin}/en/login`,
    );
  });

  it("uses the authenticated profile preference instead of a stale visitor cookie", async () => {
    const { from } = configureSupabase({
      claims: { sub: "user-123" },
      profile: { preferred_locale: "fr" },
    });

    const response = await proxy(
      makeRequest("/login", "polygest-locale=en"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(from).toHaveBeenCalledWith("users");
    expect(response.headers.get("x-middleware-request-x-polygest-locale")).toBe(
      "fr",
    );
  });

  it("gives an explicit URL locale priority over the persisted profile", async () => {
    const { from } = configureSupabase({
      claims: { sub: "user-123" },
      profile: { preferred_locale: "fr" },
    });

    const response = await proxy(
      makeRequest("/en/login", "polygest-locale=fr"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
    expect(from).not.toHaveBeenCalled();
    expect(response.headers.get("x-middleware-request-x-polygest-locale")).toBe(
      "en",
    );
  });

  it("uses the allowlisted locale on an invitation link ahead of a stale cookie", async () => {
    configureSupabase({ claims: null });

    const response = await proxy(
      makeRequest("/invitations/accept?token=" + "A".repeat(43) + "&locale=en", "polygest-locale=fr"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-x-polygest-locale")).toBe("en");
  });

  it("ignores an invalid invitation locale and falls back to the preference cookie", async () => {
    configureSupabase({ claims: null });

    const response = await proxy(
      makeRequest("/invitations/accept?token=" + "A".repeat(43) + "&locale=de", "polygest-locale=en"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-request-x-polygest-locale")).toBe("en");
  });

  it("preserves refreshed auth cookies and cache headers across a redirect only", async () => {
    configureSupabase({
      claims: null,
      refresh: {
        cookies: [
          {
            name: "sb-project-auth-token",
            value: "refreshed-session",
            options: { httpOnly: true, path: "/", sameSite: "lax" },
          },
        ],
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
          Expires: "0",
          Pragma: "no-cache",
          "x-unexpected-header": "must-not-be-forwarded",
        },
      },
    });

    const response = await proxy(
      makeRequest("/login", "polygest-locale=en"),
    );

    expect(response.status).toBe(307);
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe(
      "refreshed-session",
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.headers.get("expires")).toBe("0");
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-unexpected-header")).toBeNull();
  });

  it("preserves refreshed auth state when the profile preference rebuilds the next response", async () => {
    configureSupabase({
      claims: { sub: "user-123" },
      profile: { preferred_locale: "fr" },
      refresh: {
        cookies: [
          {
            name: "sb-project-auth-token",
            value: "refreshed-session",
            options: { httpOnly: true, path: "/" },
          },
        ],
        headers: {
          "cache-control": "private, no-store, max-age=0",
          expires: "0",
          pragma: "no-cache",
        },
      },
    });

    const response = await proxy(
      makeRequest("/login", "polygest-locale=en"),
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get("sb-project-auth-token")?.value).toBe(
      "refreshed-session",
    );
    expect(response.headers.get("cache-control")).toBe(
      "private, no-store, max-age=0",
    );
    expect(response.headers.get("pragma")).toBe("no-cache");
    expect(response.headers.get("x-middleware-request-x-polygest-locale")).toBe(
      "fr",
    );
  });
});
