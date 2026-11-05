import { ResetPasswordPage } from "@/components/auth/reset-password-page";

export default function Page({ searchParams }: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  return <ResetPasswordPage locale="fr" searchParams={searchParams} />;
}
