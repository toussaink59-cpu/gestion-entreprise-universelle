import { ContactsPage } from "@/app/dashboard/contacts/contacts-page";

export const instant = false;

type ClientsPageProps = {
  searchParams: Promise<{
    company?: string;
    q?: string;
    status?: string;
    error?: string;
    success?: string;
  }>;
};

export default function ClientsPage({ searchParams }: ClientsPageProps) {
  return <ContactsPage kind="customer" searchParams={searchParams} />;
}
