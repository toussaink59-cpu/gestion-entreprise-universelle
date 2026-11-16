import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RegisterPage } from "@/components/auth/register-page";
import { isLocale } from "@/i18n/locale";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === "en" ? "Create an account · PolyGest" : "Créer un compte · PolyGest",
    robots: { index: false, follow: false },
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <RegisterPage locale={locale} searchParams={searchParams} />;
}