import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LoginPage } from "@/components/auth/login-page";
import { isLocale } from "@/i18n/locale";

export const metadata: Metadata = {
  title: "Sign in · PolyGest",
  robots: { index: false, follow: false },
};

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; message?: string; next?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <LoginPage locale={locale} searchParams={searchParams} />;
}
