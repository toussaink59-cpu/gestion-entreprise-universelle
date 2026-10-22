import { NextResponse, type NextRequest } from "next/server";
import { getSafeRedirectPath } from "@/lib/security/safe-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  // Use a configured canonical origin, never the untrusted request Host.
  const configuredAppUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const redirectOrigin = new URL(configuredAppUrl).origin;

  const code = url.searchParams.get("code");
  const next = getSafeRedirectPath(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation-failed", redirectOrigin),
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL("/login?error=confirmation-failed", redirectOrigin),
    );
  }

  return NextResponse.redirect(new URL(next, redirectOrigin));
}