import { createHash, randomBytes } from "node:crypto";

export type InvitationEmailReason = "config" | "provider" | "rate-limit";
export type InvitationEmailResult =
  | { ok: true; emailId: string }
  | { ok: false; reason: InvitationEmailReason };

export function createInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashInvitationToken(token) };
}

export function isValidInvitationToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export function hashInvitationToken(token: string): string {
  if (!isValidInvitationToken(token)) throw new Error("invalid invitation token");
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#39;";
      default: return character;
    }
  });
}

export type InvitationEmailLocale = "fr" | "en";

const ROLE_LABELS: Record<InvitationEmailLocale, Record<string, string>> = {
  fr: { employee: "Employé", finance: "Finance", sales_purchasing: "Commercial / achats", auditor: "Auditeur", company_admin: "Administrateur d’entreprise", owner: "Propriétaire" },
  en: { employee: "Employee", finance: "Finance", sales_purchasing: "Sales / purchasing", auditor: "Auditor", company_admin: "Company administrator", owner: "Owner" },
};

export function roleLabelForEmail(roleCode: string, locale: InvitationEmailLocale = "fr"): string {
  return ROLE_LABELS[locale][roleCode] ?? (locale === "en" ? "Member" : "Membre");
}

export function isMemberInvitationEmailConfigured(): boolean {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!apiKey || !from || !baseUrl) return false;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    if (url.protocol === "http:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function buildInvitationEmail(params: {
  companyName: string;
  roleLabel: string;
  inviterName: string;
  acceptUrl: string;
  locale?: InvitationEmailLocale;
}): { subject: string; html: string; text: string } {
  const locale = params.locale ?? "fr";
  const company = escapeHtml(params.companyName);
  const role = escapeHtml(params.roleLabel);
  const inviter = escapeHtml(params.inviterName);
  const urlHtml = escapeHtml(params.acceptUrl);
  const french = locale === "fr";
  const subject = french ? `Invitation à rejoindre ${params.companyName} sur PolyGest` : `Invitation to join ${params.companyName} on PolyGest`;
  const heading = french ? "Tu es invité(e) à rejoindre une entreprise" : "You are invited to join a company";
  const invitation = french ? `${inviter} t’invite à rejoindre <strong>${company}</strong> avec le rôle <strong>${role}</strong>.` : `${inviter} invited you to join <strong>${company}</strong> as <strong>${role}</strong>.`;
  const confirmation = french ? "Confirme que tu as accès à cette adresse e-mail. Pour des raisons de sécurité, le propriétaire devra encore activer ton accès après vérification." : "Confirm that you have access to this email address. For security, the owner must still review and activate your access.";
  const button = french ? "Confirmer l’invitation" : "Confirm invitation";
  const expiry = french ? "Ce lien est à usage unique et expire dans 7 jours. Si tu n’attendais pas cette invitation, ignore ce message." : "This one-time link expires in 7 days. If you were not expecting this invitation, you can ignore this message.";
  const text = french
    ? `${params.inviterName} t’invite à rejoindre ${params.companyName} sur PolyGest avec le rôle ${params.roleLabel}. Confirme l’accès à ton adresse e-mail : ${params.acceptUrl}\n\nLe propriétaire devra encore activer ton accès après vérification. Ce lien est à usage unique et expire dans 7 jours. Si tu n’attendais pas cette invitation, ignore ce message.`
    : `${params.inviterName} invited you to join ${params.companyName} on PolyGest as ${params.roleLabel}. Confirm access to your email address: ${params.acceptUrl}\n\nThe owner must still review and activate your access. This one-time link expires in 7 days. If you were not expecting this invitation, ignore this message.`;
  return {
    subject,
    html: `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f8fafc;font-family:Arial,sans-serif;color:#0f172a"><main style="max-width:600px;margin:32px auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:32px"><p style="font-size:12px;font-weight:bold;letter-spacing:2px;color:#1d4ed8">POLYGEST · TEAM</p><h1 style="font-size:24px">${heading}</h1><p>${invitation}</p><p>${confirmation}</p><p style="margin:28px 0"><a href="${urlHtml}" style="background:#1d4ed8;color:#fff;text-decoration:none;padding:13px 20px;border-radius:8px;font-weight:bold;display:inline-block">${button}</a></p><p style="font-size:13px;color:#64748b">${expiry}</p><p style="font-size:12px;color:#94a3b8">PolyGest · Business management</p></main></body></html>`,
    text,
  };
}

export async function sendMemberInvitationEmail(params: {
  to: string;
  companyName: string;
  roleCode: string;
  inviterName: string;
  locale?: InvitationEmailLocale;
  token: string;
  idempotencyKey: string;
}): Promise<InvitationEmailResult> {
  if (!isMemberInvitationEmailConfigured() || !isValidInvitationToken(params.token)) {
    return { ok: false, reason: "config" };
  }
  const apiKey = process.env.RESEND_API_KEY!.trim();
  const from = process.env.RESEND_FROM_EMAIL!.trim();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL!.trim();
  const url = new URL("/invitations/accept", baseUrl);
  url.searchParams.set("token", params.token);
  const email = buildInvitationEmail({
    companyName: params.companyName,
    roleLabel: roleLabelForEmail(params.roleCode, params.locale),
    inviterName: params.inviterName || (params.locale === "en" ? "A PolyGest administrator" : "Un administrateur PolyGest"),
    acceptUrl: url.toString(),
    locale: params.locale,
  });
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": params.idempotencyKey.slice(0, 256),
      },
      body: JSON.stringify({
        from,
        to: [params.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
    });
    if (response.status === 429) return { ok: false, reason: "rate-limit" };
    if (!response.ok) return { ok: false, reason: "provider" };
    const responseBody: unknown = await response.json();
    if (
      !responseBody || typeof responseBody !== "object" ||
      !("id" in responseBody) || typeof responseBody.id !== "string"
    ) return { ok: false, reason: "provider" };
    return { ok: true, emailId: responseBody.id };
  } catch {
    return { ok: false, reason: "provider" };
  }
}
