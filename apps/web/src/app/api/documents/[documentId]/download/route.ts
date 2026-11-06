import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDocumentFeatureEnabled } from "@/lib/security/document-feature-gate";
import {
  DOCUMENT_BUCKET,
  DOCUMENT_SIGNED_URL_TTL_SECONDS,
} from "@/lib/security/document-validation";


const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ documentId: string }> },
) {
  if (!isDocumentFeatureEnabled()) {
    return jsonError(
      503,
      "documents_disabled",
      "Les téléchargements de documents sont désactivés pendant la Phase 1.",
    );
  }

  const { documentId } = await context.params;
  if (!UUID_PATTERN.test(documentId)) {
    return jsonError(404, "not_found", "Document introuvable.");
  }

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return jsonError(401, "unauthorized", "Connecte-toi pour télécharger ce document.");
  }

  const { data: document, error } = await supabase
    .from("documents")
    .select("id, storage_path, original_name, scan_status")
    .eq("id", documentId)
    .maybeSingle();

  if (error || !document) {
    return jsonError(404, "not_found", "Document introuvable ou non accessible.");
  }

  if (document.scan_status === "pending_upload" || document.scan_status === "pending_scan") {
    return jsonError(409, "scan_pending", "Ce fichier reste inaccessible tant que son analyse de sécurité n'est pas terminée.");
  }
  if (document.scan_status !== "available") {
    return jsonError(410, "document_rejected", "Ce fichier a été bloqué par le contrôle de sécurité.");
  }

  // createSignedUrl est volontairement appelé avec le client JWT de l'utilisateur.
  // La policy SELECT de storage.objects revérifie la permission du module parent.
  const { data, error: signedUrlError } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(
      document.storage_path,
      DOCUMENT_SIGNED_URL_TTL_SECONDS,
      { download: document.original_name },
    );

  if (signedUrlError || !data?.signedUrl) {
    console.error("Private document signed URL failed:", { code: signedUrlError?.name });
    return jsonError(503, "download_unavailable", "Le lien de téléchargement n'a pas pu être créé.");
  }

  const response = NextResponse.redirect(data.signedUrl, 303);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Content-Type-Options", "nosniff");
  return response;
}
