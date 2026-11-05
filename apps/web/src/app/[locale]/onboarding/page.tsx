import { notFound } from "next/navigation";
import { OnboardingPage } from "@/components/companies/onboarding-page";
import { isLocale } from "@/i18n/locale";

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return <OnboardingPage locale={locale} />;
}
