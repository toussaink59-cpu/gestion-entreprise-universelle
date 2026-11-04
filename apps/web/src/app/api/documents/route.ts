import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  DOCUMENT_BUCKET,
  isDocumentSizeAllowed,
  sanitizeDocumentFilename,
} from "@/lib/security/document-validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_PATTERN = /^[a-z_]{1,40}$/;

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { error: code, message },
    {
      status,
      headers: {
        "Cache-Control": "no-store, private",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

function sameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  return origin !== null && origin === request.nextUrl.origin;
}

function validUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validCode(value: unknown): value is string {
  return typeof value === "string" && CODE_PATTERN.test(value);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const companyId = params.get("companyId");
  const moduleCode = params.get("moduleCode");
  const entityType = params.get("entityType");
  const entityId = params.get("entityId");

  if (
    !validUuid(companyId) ||
    !validCode(moduleCode) ||
    !validCode(entityType) ||
    !validUuid(entityId)
  ) {
    return jsonError(400, "invalid_request", "Paramètres de consultation invalides.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError(401, "unauthorized", "Connecte-toi pour consulter les pièces jointes.");
  }

  const { data, error } = await supabase
    .from("documents")
    .select("id, original_name, mime_type, byte_size, scan_status, created_at")
    .eq("company_id", companyId)
    .eq("module_code", moduleCode)
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("Document list failed:", { code: error.code });
    return jsonError(500, "list_failed", "Impossible de charger les pièces jointes.");
  }

  return NextResponse.json(
    { documents: data ?? [] },
    {
      headers: {
        "Cache-Control": "no-store, private",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

/**
 * Ouvre une session d'upload. Le binaire est ensuite envoyé directement de
 * l'ordinateur de l'utilisateur à Storage à l'aide du jeton signé à usage unique.
 */
export async function POST(request: NextRequest) {
  if (process.env.DOCUMENT_SCANNER_ENABLED !== "true") {
    return jsonError(
      503,
      "scanner_not_configured",
      "Le dépôt de fichiers sera activé après la configuration du moteur d'analyse de sécurité.",
    );
  }

  if (!sameOrigin(request)) {
    return jsonError(403, "origin_denied", "Origine de requête non autorisée.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_request", "La demande d'envoi est invalide.");
  }

  if (!body || typeof body !== "object") {
    return jsonError(400, "invalid_request", "La demande d'envoi est invalide.");
  }

  const input = body as Record<string, unknown>;
  const companyId = input.companyId;
  const moduleCode = input.moduleCode;
  const entityType = input.entityType;
  const entityId = input.entityId;
  const fileName = input.fileName;
  const mimeType = input.mimeType;
  const byteSize = input.byteSize;

  if (
    !validUuid(companyId) ||
    !validCode(moduleCode) ||
    !validCode(entityType) ||
    !validUuid(entityId) ||
    typeof fileName !== "string" ||
    typeof mimeType !== "string" ||
    !ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]) ||
    typeof byteSize !== "number" ||
    !isDocumentSizeAllowed(byteSize)
  ) {
    return jsonError(400, "invalid_request", "Entreprise, fiche ou caractéristiques du fichier invalides.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError(401, "unauthorized", "Connecte-toi pour déposer un document.");
  }

  const originalName = sanitizeDocumentFilename(fileName);

  // La fonction SQL refait le contrôle des droits et du rattachement à la fiche,
  // puis crée les métadonnées dans la même transaction et sous le JWT courant.
  const { data: reservation, error: reservationError } = await supabase.rpc("create_document_upload", {
    p_company_id: companyId,
    p_module_code: moduleCode,
    p_entity_type: entityType,
    p_entity_id: entityId,
    p_original_name: originalName,
    p_mime_type: mimeType,
    p_byte_size: byteSize,
  });

  const reservationRow = Array.isArray(reservation) ? reservation[0] : reservation;
  if (reservationError || !reservationRow?.document_id || !reservationRow?.storage_path) {
    console.error("Document reservation failed:", { code: reservationError?.code });
    const status = reservationError?.code === "42501" ? 403 : 400;
    return jsonError(
      status,
      status === 403 ? "permission_denied" : "document_create_failed",
      status === 403
        ? "Tu ne peux pas joindre un fichier à cette fiche."
        : "La session de dépôt n'a pas pu être réservée.",
    );
  }

  const documentId = String(reservationRow.document_id);
  const storagePath = String(reservationRow.storage_path);

  let service;
  try {
    service = createServiceClient();
  } catch {
    return jsonError(503, "storage_not_configured", "Le stockage privé n'est pas encore configuré sur cet environnement.");
  }

  const { data: signedUpload, error: signedUploadError } = await service.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUploadUrl(storagePath, { upsert: false });

  if (signedUploadError || !signedUpload?.token) {
    console.error("Private document upload token failed:", { name: signedUploadError?.name });
    await service.from("documents").delete().eq("id", documentId);
    return jsonError(503, "upload_session_failed", "La session de dépôt n'a pas pu être créée.");
  }

  return NextResponse.json(
    {
      document: {
        id: documentId,
        original_name: originalName,
        mime_type: mimeType,
        byte_size: byteSize,
        scan_status: "pending_upload",
      },
      upload: {
        path: signedUpload.path,
        token: signedUpload.token,
      },
    },
    {
      status: 201,
      headers: {
        "Cache-Control": "no-store, private",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}

/**
 * Termine un upload ou annule une session en attente.
 * Une session est toujours liée à son créateur ; un autre membre ne peut pas
 * finaliser ou supprimer son objet.
 */
export async function PUT(request: NextRequest) {
  if (!sameOrigin(request)) {
    return jsonError(403, "origin_denied", "Origine de requête non autorisée.");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "invalid_request", "La demande est invalide.");
  }
  if (!body || typeof body !== "object") {
    return jsonError(400, "invalid_request", "La demande est invalide.");
  }

  const input = body as Record<string, unknown>;
  const documentId = input.documentId;
  const action = input.action;
  if (!validUuid(documentId) || (action !== "complete" && action !== "cancel")) {
    return jsonError(400, "invalid_request", "Document ou action invalide.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError(401, "unauthorized", "Connecte-toi pour terminer le dépôt.");
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return jsonError(503, "storage_not_configured", "Le stockage privé n'est pas encore configuré sur cet environnement.");
  }

  const { data: document, error: documentError } = await service
    .from("documents")
    .select("id, created_by, storage_path, scan_status")
    .eq("id", documentId)
    .maybeSingle();

  if (documentError || !document || document.created_by !== user.id) {
    return jsonError(404, "not_found", "Session de dépôt introuvable.");
  }
  if (document.scan_status !== "pending_upload") {
    return jsonError(409, "invalid_state", "Cette session de dépôt n'est plus modifiable.");
  }

  if (action === "cancel") {
    const { error: removeError } = await service.storage
      .from(DOCUMENT_BUCKET)
      .remove([document.storage_path]);
    if (removeError) {
      console.error("Private document cleanup failed:", { name: removeError.name });
      return jsonError(502, "cleanup_failed", "Le fichier temporaire n'a pas pu être nettoyé.");
    }
    const { error: deleteError } = await service
      .from("documents")
      .delete()
      .eq("id", documentId)
      .eq("created_by", user.id);
    if (deleteError) {
      console.error("Document session cleanup failed:", { code: deleteError.code });
      return jsonError(500, "cleanup_failed", "La session temporaire n'a pas pu être annulée.");
    }
    return NextResponse.json({ cancelled: true }, { headers: { "Cache-Control": "no-store, private" } });
  }

  const { error: completeError } = await service.rpc("complete_document_upload", {
    p_document_id: documentId,
  });
  if (completeError) {
    console.error("Document upload finalization failed:", { code: completeError.code });
    return jsonError(409, "upload_not_complete", "L'objet n'est pas encore présent dans le stockage.");
  }

  return NextResponse.json(
    { documentId, scanStatus: "pending_scan" },
    { headers: { "Cache-Control": "no-store, private" } },
  );
}
