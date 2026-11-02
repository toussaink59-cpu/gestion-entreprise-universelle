import { isValidInvitationToken } from "./member-invitation";

/**
 * Lien d'invitation transmis à la main (quand l'envoi d'e-mail n'est pas configuré ou échoue).
 * Le jeton reste lié à l'adresse e-mail du destinataire : il ne sert qu'à lui, connecté avec ce compte.
 */
export const INVITATION_LINK_COOKIE = "polygest_invitation_link";
export const INVITATION_LINK_COOKIE_PATH = "/dashboard/membres";
export const INVITATION_LINK_COOKIE_MAX_AGE_SECONDS = 120;

export function invitationAcceptPath(token: string): string {
  if (!isValidInvitationToken(token)) throw new Error("invalid invitation token");
  return `/invitations/accept?token=${token}`;
}

/** Relit le cookie en refusant tout ce qui n'est pas exactement un chemin d'acceptation valide. */
export function parseInvitationLinkCookie(value: string | undefined): string | null {
  if (!value) return null;
  const match = /^\/invitations\/accept\?token=([A-Za-z0-9_-]{43})$/.exec(value);
  return match ? value : null;
}

function validOrigin(raw: string | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol === "https:") return url.origin;
    if (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)) return url.origin;
    return null;
  } catch {
    return null;
  }
}

/**
 * Adresse publique de l'application : NEXT_PUBLIC_APP_URL si elle est valide,
 * sinon l'hôte de la requête (https obligatoire hors localhost).
 */
export function resolveAppOrigin(params: {
  configuredUrl?: string;
  host?: string | null;
  forwardedProto?: string | null;
}): string | null {
  const configured = validOrigin(params.configuredUrl);
  if (configured) return configured;
  const host = params.host?.trim();
  if (!host || !/^[A-Za-z0-9.-]+(:\d{1,5})?$/.test(host)) return null;
  const isLocal = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const proto = isLocal ? (params.forwardedProto === "https" ? "https" : "http") : "https";
  return validOrigin(`${proto}://${host}`);
}
