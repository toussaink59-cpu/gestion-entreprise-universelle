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
    <section role="region" aria-label={t("linkRegion")} className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="text-sm font-semibold">{t("linkTitle")}</p>
      <input readOnly value={link} aria-label={t("copyLinkAria")} onFocus={(event) => event.currentTarget.select()} className="mt-2 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900" />
      <p className="mt-2 text-xs">{t("linkInstructions")}</p>
    </section>
  );
}
