"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { consumeInvitationLink } from "./actions";

export function InvitationLinkReveal() {
  const t = useTranslations("Members");
  const started = useRef(false);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void consumeInvitationLink().then(setLink).catch(() => setLink(null));
  }, []);

  if (!link) return null;

  return (
    <section role="region" aria-label={t("linkRegion")} className="mb-5 rounded-lg border border-[#EADFC0] bg-[#F8F4EA] p-4 text-[#76571F]">
      <p className="text-sm font-semibold">{t("linkTitle")}</p>
      <input readOnly value={link} aria-label={t("copyLinkAria")} onFocus={(event) => event.currentTarget.select()} className="mt-2 block w-full rounded-lg border border-[#EADFC0] bg-[var(--pg-surface)] px-3 py-2 text-sm text-[var(--pg-text)]" />
      <p className="mt-2 text-xs">{t("linkInstructions")}</p>
    </section>
  );
}
