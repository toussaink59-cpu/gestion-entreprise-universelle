import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";
import { isLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Reset password · PolyGest" : "Nouveau mot de passe · PolyGest",
    robots: { index: false, follow: false },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ResetPasswordPage locale={locale} searchParams={searchParams} />;
}