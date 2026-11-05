import { ForgotPasswordPage } from "@/components/auth/forgot-password-page";

export default function Page({ searchParams }: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  return <ForgotPasswordPage locale="fr" searchParams={searchParams} />;
}
