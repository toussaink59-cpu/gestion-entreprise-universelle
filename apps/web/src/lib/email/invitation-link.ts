import { isValidInvitationToken } from "./member-invitation";
import type { Locale } from "@/i18n/locale";

/**
 * Lien d'invitation transmis à la main (quand l'envoi d'e-mail n'est pas configuré ou échoue).
 * Le jeton reste lié à l'adresse e-mail du destinataire : il ne sert qu'à lui, connecté avec ce compte.
 */
export const INVITATION_LINK_COOKIE = "polygest_invitation_link";
export const INVITATION_LINK_COOKIE_PATH = "/dashboard/membres";
export const INVITATION_LINK_COOKIE_MAX_AGE_SECONDS = 120;

export function invitationAcceptPath(token: string, locale?: Locale): string {
  if (!isValidInvitationToken(token)) throw new Error("invalid invitation token");
  const localeQuery = locale ? `&locale=${locale}` : "";
  return `/invitations/accept?token=${token}${localeQuery}`;
}

/** Relit le cookie en refusant tout ce qui n'est pas exactement un chemin d'acceptation valide. */
export function parseInvitationLinkCookie(value: string | undefined, expectedUserId: string | null | undefined): string | null {
  if (!value || !expectedUserId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(expectedUserId)) return null;
  const separator = value.indexOf("|");
  if (separator < 0 || value.slice(0, separator).toLowerCase() !== expectedUserId.toLowerCase()) return null;
  const path = value.slice(separator + 1);
  return /^\/invitations\/accept\?token=[A-Za-z0-9_-]{43}(?:&locale=(?:fr|en))?$/.test(path) ? path : null;
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
