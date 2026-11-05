import { notFound } from "next/navigation";
import { ResetPasswordPage } from "@/components/auth/reset-password-page";
import { isLocale } from "@/i18n/locale";

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
