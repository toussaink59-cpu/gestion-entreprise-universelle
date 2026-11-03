"use client";

import { useEffect, useRef, useState } from "react";
import { consumeInvitationLink } from "./actions";

export function InvitationLinkReveal() {
  const started = useRef(false);
  const [link, setLink] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void consumeInvitationLink().then(setLink).catch(() => setLink(null));
  }, []);

  if (!link) return null;

  return (
    <section role="region" aria-label="Lien d’invitation" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950">
      <p className="text-sm font-semibold">Lien d’invitation (valable 7 jours, à usage unique)</p>
      <input readOnly value={link} aria-label="Lien d’invitation à copier" onFocus={(event) => event.currentTarget.select()} className="mt-2 block w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900" />
      <p className="mt-2 text-xs">Transmets-le uniquement à la personne invitée (WhatsApp, SMS…). Il ne fonctionne que si elle se connecte avec l’adresse e-mail invitée. Le lien ne sera plus affiché après cette lecture.</p>
    </section>
  );
}
