"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isValidEmail,
  isValidFullName,
  isValidNewPassword,
  normalizeEmail,
  readStringField,
} from "@/lib/security/form-validation";

export async function signIn(formData: FormData) {
  const emailField = readStringField(formData, "email");
  const password = readStringField(formData, "password");

  if (emailField === null || password === null || !emailField.trim() || !password) {
    redirect("/login?error=missing-fields");
  }

  const email = normalizeEmail(emailField);

  if (!isValidEmail(email)) {
    redirect("/login?error=invalid-email");
  }

  if (password.length > 128) {
    redirect("/login?error=password-too-long");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Supabase sign-in failed:", {
      code: error.code,
      status: error.status,
    });

    if (error.code === "email_not_confirmed") {
      redirect("/login?error=email-not-confirmed");
    }

    redirect("/login?error=invalid-credentials");
  }

  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const fullNameField = readStringField(formData, "full_name");
  const emailField = readStringField(formData, "email");
  const password = readStringField(formData, "password");

  if (
    fullNameField === null ||
    emailField === null ||
    password === null ||
    !fullNameField.trim() ||
    !emailField.trim() ||
    !password
  ) {
    redirect("/register?error=missing-fields");
  }

  const fullName = fullNameField.trim();
  const email = normalizeEmail(emailField);

  if (!isValidFullName(fullName)) {
    redirect("/register?error=invalid-name");
  }

  if (!isValidEmail(email)) {
    redirect("/register?error=invalid-email");
  }

  if (password.length < 8) {
    redirect("/register?error=password-too-short");
  }

  if (!isValidNewPassword(password)) {
    redirect("/register?error=password-too-long");
  }

  const supabase = await createClient();
  const configuredUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const appUrl = new URL(configuredUrl).origin;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${appUrl}/auth/callback?next=%2Fonboarding`,
    },
  });

  if (error) {
    console.error("Supabase sign-up failed:", {
      code: error.code,
      status: error.status,
    });
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