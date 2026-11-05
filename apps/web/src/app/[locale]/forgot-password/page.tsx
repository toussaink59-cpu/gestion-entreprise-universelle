import { notFound } from "next/navigation";
import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";
import { isLocale } from "@/i18n/locale";

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
