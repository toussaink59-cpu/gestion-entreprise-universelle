import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

function localeForPath(pathname: string): "fr" | "en" {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fr";
}

export async function proxy(request: NextRequest) {
  const locale = localeForPath(request.nextUrl.pathname);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-polygest-locale", locale);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
          for (const [key, value] of Object.entries(headers)) {
            supabaseResponse.headers.set(key, value);
          }
        },
      },
    });

    await supabase.auth.getClaims();
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
