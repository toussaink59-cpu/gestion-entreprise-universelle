import { randomUUID, createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  detectDocumentMime,
  DOCUMENT_BUCKET,
  DOCUMENT_MAX_SIZE_BYTES,
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

function validUuid(value: string | null): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function validCode(value: string | null): value is string {
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

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) {
    return jsonError(403, "origin_denied", "Origine de requête non autorisée.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > DOCUMENT_MAX_SIZE_BYTES + 256 * 1024) {
    return jsonError(413, "file_too_large", "La taille maximale est de 20 Mio.");
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError(400, "invalid_form", "Le formulaire de téléversement est invalide.");
  }

  const companyId = formData.get("companyId");
  const moduleCode = formData.get("moduleCode");
  const entityType = formData.get("entityType");
  const entityId = formData.get("entityId");
  const file = formData.get("file");

  if (
    typeof companyId !== "string" ||
    !UUID_PATTERN.test(companyId) ||
    typeof moduleCode !== "string" ||
    !CODE_PATTERN.test(moduleCode) ||
    typeof entityType !== "string" ||
    !CODE_PATTERN.test(entityType) ||
    typeof entityId !== "string" ||
    !UUID_PATTERN.test(entityId) ||
    !(file instanceof File)
  ) {
    return jsonError(400, "invalid_request", "Entreprise, fiche ou fichier invalide.");
  }

  if (!isDocumentSizeAllowed(file.size)) {
    return jsonError(413, "file_too_large", "Le fichier doit peser entre 1 octet et 20 Mio.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength !== file.size) {
    return jsonError(400, "invalid_file", "Le fichier transmis est incomplet.");
  }

  const detectedMime = detectDocumentMime(bytes);
  if (!detectedMime) {
    return jsonError(415, "unsupported_file", "Formats acceptés : PDF, JPEG, PNG et WebP.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError(401, "unauthorized", "Connecte-toi pour déposer un document.");
  }

  // Le contrôle SQL utilise le JWT courant et vérifie la permission de création
  // ainsi que l'appartenance réelle de la fiche à l'entreprise ciblée.
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
  const originalName = sanitizeDocumentFilename(file.name);
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  const { error: insertError } = await service.from("documents").insert({
    id: documentId,
    company_id: companyId,
    module_code: moduleCode,
    entity_type: entityType,
    entity_id: entityId,
    storage_path: storagePath,
    original_name: originalName,
    mime_type: detectedMime,
    byte_size: bytes.byteLength,
    sha256,
    scan_status: "pending_upload",
    created_by: user.id,
  });

  if (insertError) {
    console.error("Document metadata insert failed:", { code: insertError.code });
    return jsonError(500, "document_create_failed", "Le document n'a pas pu être enregistré.");
  }

  const { error: uploadError } = await service.storage
    .from(DOCUMENT_BUCKET)
    .upload(storagePath, Buffer.from(bytes), {
      cacheControl: "0",
      contentType: detectedMime,
      upsert: false,
    });

  if (uploadError) {
    console.error("Private document upload failed:", { statusCode: uploadError.statusCode });
    await service.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    await service.from("documents").delete().eq("id", documentId);
    return jsonError(502, "upload_failed", "Le stockage a refusé le fichier. Réessaie.");
  }

  const { error: completeError } = await service.rpc("complete_document_upload", {
    p_document_id: documentId,
  });

  if (completeError) {
    console.error("Document upload finalization failed:", { code: completeError.code });
    await service.storage.from(DOCUMENT_BUCKET).remove([storagePath]);
    await service.from("documents").delete().eq("id", documentId);
    return jsonError(502, "upload_finalize_failed", "Le document n'a pas pu être finalisé.");
  }

  return NextResponse.json(
    {
      document: {
        id: documentId,
        original_name: originalName,
        mime_type: detectedMime,
        byte_size: bytes.byteLength,
        scan_status: "pending_scan",
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
