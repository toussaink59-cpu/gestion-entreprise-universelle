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

function localeInPath(pathname: string): "fr" | "en" | null {
  if (pathname === "/en" || pathname.startsWith("/en/")) return "en";
  if (pathname === "/fr" || pathname.startsWith("/fr/")) return "fr";
  return null;
}

function responseWithCookies(
  requestHeaders: Headers,
  previousResponse?: NextResponse,
): NextResponse {
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (previousResponse) {
    for (const cookie of previousResponse.cookies.getAll()) {
      response.cookies.set(cookie);
    }
    for (const [name, value] of previousResponse.headers) {
      if (name.toLowerCase() !== "set-cookie") response.headers.set(name, value);
    }
  }
  return response;
}

function redirectWithCookies(
  destination: URL,
  previousResponse: NextResponse,
): NextResponse {
  const response = NextResponse.redirect(destination);
  for (const cookie of previousResponse.cookies.getAll()) {
    response.cookies.set(cookie);
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const explicitLocale = localeInPath(pathname);
  let locale = explicitLocale ?? localeFrom(request.cookies.get("polygest-locale")?.value);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-polygest-locale", locale);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let supabaseResponse = responseWithCookies(requestHeaders);
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
          // Keep the forwarded request cookie header synchronized with the
          // refreshed Supabase cookie jar and retain the validated locale.
          requestHeaders.set("cookie", request.cookies.toString());
          requestHeaders.set("x-polygest-locale", locale);
          supabaseResponse = responseWithCookies(requestHeaders, supabaseResponse);
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            supabaseResponse.headers.set(key, value);
          }
        },
      },
    });

    const { data } = await supabase.auth.getClaims();
    const subject = data?.claims?.sub;
    if (typeof subject === "string") authenticatedUserId = subject;

    // Read the persisted preference only on localized authentication routes.
    // This avoids a profile query on every application request.
    if (!explicitLocale && authenticatedUserId && preferenceAwareRoutes.has(pathname)) {
      const { data: profile } = await supabase
        .from("users")
        .select("preferred_locale")
        .eq("id", authenticatedUserId)
        .maybeSingle();

      if (isLocale(profile?.preferred_locale)) {
        locale = profile.preferred_locale;
        requestHeaders.set("x-polygest-locale", locale);
        supabaseResponse = responseWithCookies(requestHeaders, supabaseResponse);
      }
    }
  }

  if (
    !explicitLocale &&
    locale === "en" &&
    preferenceAwareRoutes.has(pathname)
  ) {
    const destination = request.nextUrl.clone();
    destination.pathname = `/en${pathname}`;
    return redirectWithCookies(destination, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
