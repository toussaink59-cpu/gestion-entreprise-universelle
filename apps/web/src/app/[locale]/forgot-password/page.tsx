import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";
import { isLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Forgot password · PolyGest" : "Mot de passe oublié · PolyGest",
    robots: { index: false, follow: false },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <ForgotPasswordPage locale={locale} searchParams={searchParams} />;
}