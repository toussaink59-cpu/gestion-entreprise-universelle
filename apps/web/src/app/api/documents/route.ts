import { randomUUID } from "node:crypto";
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

  // La permission est évaluée par PostgreSQL avec le JWT de l'utilisateur.
  const { data: allowed, error: permissionError } = await supabase.rpc("can_upload_document", {
    p_company_id: companyId,
    p_module_code: moduleCode,
    p_entity_type: entityType,
    p_entity_id: entityId,
  });

  if (permissionError || allowed !== true) {
    return jsonError(403, "permission_denied", "Tu ne peux pas joindre un fichier à cette fiche.");
  }

  let service;
  try {
    service = createServiceClient();
  } catch {
    return jsonError(503, "storage_not_configured", "Le stockage privé n'est pas encore configuré sur cet environnement.");
  }

  const documentId = randomUUID();
  const storagePath = `${companyId}/${documentId}`;
  const originalName = sanitizeDocumentFilename(fileName);

  const { error: insertError } = await service.from("documents").insert({
    id: documentId,
    company_id: companyId,
    module_code: moduleCode,
    entity_type: entityType,
    entity_id: entityId,
    storage_path: storagePath,
    original_name: originalName,
    mime_type: mimeType,
    byte_size: byteSize,
    sha256: null,
    scan_status: "pending_upload",
    created_by: user.id,
  });

  if (insertError) {
    console.error("Document metadata insert failed:", { code: insertError.code });
    return jsonError(500, "document_create_failed", "Le document n'a pas pu être réservé.");
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
