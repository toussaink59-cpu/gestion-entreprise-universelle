import type { Metadata } from "next";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";

export const metadata: Metadata = {
  title: "Nouveau mot de passe · PolyGest",
  robots: { index: false, follow: false },
};

export default function Page({ searchParams }: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  return <ResetPasswordPage locale="fr" searchParams={searchParams} />;
}