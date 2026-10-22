"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing-fields");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase sign-in failed:", { code: error.code, status: error.status });

    if (error.code === "email_not_confirmed") {
      redirect("/login?error=email-not-confirmed");
    }

    redirect("/login?error=invalid-credentials");
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    redirect("/register?error=missing-fields");
  }

  if (password.length < 8) {
    redirect("/register?error=password-too-short");
  }

  const supabase = await createClient();
  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/+$/, "");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
      emailRedirectTo: `${appUrl}/auth/callback?next=%2Fonboarding`,
    },
  });

  if (error) {
    redirect("/register?error=signup-failed");
  }

  if (data.session) {
    redirect("/onboarding");
  }

  redirect("/login?message=check-email");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}