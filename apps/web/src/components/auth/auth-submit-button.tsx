"use client";

import { useFormStatus } from "react-dom";

export function AuthSubmitButton({
  label,
  pendingLabel = "Processing…",
}: {
  label: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-disabled={pending}
      className="inline-flex min-h-[54px] w-full items-center justify-center rounded-xl bg-[#087fa8] px-5 py-3 text-base font-semibold text-white shadow-md transition-colors hover:bg-[#066b8a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087fa8] disabled:cursor-wait disabled:opacity-70"
    >
      {pending ? pendingLabel : label}
    </button>
  );
}