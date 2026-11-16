import type { Metadata } from "next";
import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";

export const metadata: Metadata = {
  title: "Mot de passe oublié · PolyGest",
  robots: { index: false, follow: false },
};

export default function Page({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <ForgotPasswordPage locale="fr" searchParams={searchParams} />;
}