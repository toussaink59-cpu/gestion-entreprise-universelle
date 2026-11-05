import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale, localeFrom } from "@/i18n/locale";

const preferenceAwareRoutes = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
]);

const supabaseCacheHeaders = ["cache-control", "expires", "pragma"] as const;

type SupabaseCacheHeader = (typeof supabaseCacheHeaders)[number];

function copySupabaseResponseState(
  target: NextResponse,
  source: NextResponse,
): void {
  for (const cookie of source.cookies.getAll()) {
    target.cookies.set(cookie);
  }

  for (const header of supabaseCacheHeaders) {
    const value = source.headers.get(header);
    if (value) target.headers.set(header, value);
  }
}

function responseWithSupabaseState(
  requestHeaders: Headers,
  previousResponse?: NextResponse,
): NextResponse {
  const response = NextResponse.next({ request: { headers: requestHeaders } });

  if (previousResponse) {
    copySupabaseResponseState(response, previousResponse);
  }

  return response;
}

function redirectWithSupabaseState(
  destination: URL,
  supabaseResponse: NextResponse,
): NextResponse {
  const response = NextResponse.redirect(destination);
  copySupabaseResponseState(response, supabaseResponse);
  return response;
}

function applySupabaseCacheHeaders(
  response: NextResponse,
  headers: Record<string, string>,
): void {
  for (const [name, value] of Object.entries(headers)) {
    const normalizedName = name.toLowerCase();

    if (
      supabaseCacheHeaders.includes(normalizedName as SupabaseCacheHeader)
    ) {
      response.headers.set(normalizedName, value);
    }
  }
}

function localeInPath(pathname: string): "fr" | "en" | null {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  return null;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const explicitLocale = localeInPath(pathname);
  let locale =
    explicitLocale ?? localeFrom(request.cookies.get("polygest-locale")?.value);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-polygest-locale", locale);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  let supabaseResponse = responseWithSupabaseState(requestHeaders);
  let authenticatedUserId: string | null = null;

  if (supabaseUrl && publishableKey) {
    const supabase = createServerClient(supabaseUrl, publishableKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          // Keep forwarded request cookies and locale headers synchronized.
          requestHeaders.set("cookie", request.cookies.toString());
          requestHeaders.set("x-polygest-locale", locale);

          const previousResponse = supabaseResponse;
          supabaseResponse = responseWithSupabaseState(
            requestHeaders,
            previousResponse,
          );

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }

          // @supabase/ssr supplies cache-control, expires and pragma here.
          // Do not forward arbitrary headers from this callback.
          applySupabaseCacheHeaders(supabaseResponse, headers);
        },
      },
    });

    const { data } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;

    if (typeof subject === "string") {
      authenticatedUserId = subject;
    }

    // Read the persisted preference only on localized authentication routes.
    // This avoids a profile query on every application request.
    if (
      !explicitLocale &&
      authenticatedUserId &&
      preferenceAwareRoutes.has(pathname)
    ) {
      const { data: profile } = await supabase
        .from("users")
        .select("preferred_locale")
        .eq("id", authenticatedUserId)
        .maybeSingle();

      if (isLocale(profile?.preferred_locale)) {
        locale = profile.preferred_locale;
        requestHeaders.set("x-polygest-locale", locale);
        supabaseResponse = responseWithSupabaseState(
          requestHeaders,
          supabaseResponse,
        );
      }
    }
  }

  if (!explicitLocale && locale === "en" && preferenceAwareRoutes.has(pathname)) {
    const destination = request.nextUrl.clone();
    destination.pathname = `/en${pathname}`;

    return redirectWithSupabaseState(destination, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
