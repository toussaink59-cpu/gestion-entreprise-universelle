import type { Metadata } from "next";
import { RegisterPage } from "@/components/auth/register-page";

export const metadata: Metadata = {
  title: "Inscription · PolyGest",
  robots: { index: false, follow: false },
};

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return <RegisterPage locale="fr" searchParams={searchParams} />;
}
