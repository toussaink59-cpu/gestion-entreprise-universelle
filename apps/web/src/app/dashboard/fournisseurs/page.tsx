import { ContactsPage } from "@/app/dashboard/contacts/contacts-page";

export const instant = false;

type FournisseursPageProps = {
  searchParams: Promise<{
    company?: string;
    q?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
};

export default function FournisseursPage({ searchParams }: FournisseursPageProps) {
  return <ContactsPage kind="supplier" searchParams={searchParams} />;
}
