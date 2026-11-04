"use client";

import { useState, type FormEvent } from "react";
import { createClient as createBrowserClient } from "@/lib/supabase/client";
import { detectDocumentMime, DOCUMENT_BUCKET } from "@/lib/security/document-validation";

type DocumentItem = {
  id: string;
  original_name: string;
  mime_type: string;
  byte_size: number;
  scan_status: "pending_upload" | "pending_scan" | "available" | "rejected";
  created_at: string;
};

type Props = {
  companyId: string;
  moduleCode: "customers" | "suppliers";
  entityType: "customer" | "supplier";
  entityId: string;
  canUpload: boolean;
  scannerEnabled: boolean;
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mio`;
}

function statusLabel(status: DocumentItem["scan_status"]): string {
  switch (status) {
    case "available": return "Contrôle terminé";
    case "pending_upload": return "Téléversement en cours";
    case "pending_scan": return "Analyse de sécurité en attente";
    case "rejected": return "Fichier bloqué";
  }
}

export function DocumentAttachments({
  companyId,
  moduleCode,
  entityType,
  entityId,
  canUpload,
  scannerEnabled,
}: Props) {
  const [open, setOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);

  async function loadDocuments() {
    setLoading(true);
    setMessage(null);
    setMessageIsError(false);
    try {
      const query = new URLSearchParams({
        companyId,
        moduleCode,
        entityType,
        entityId,
      });
      const response = await fetch(`/api/documents?${query.toString()}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload || !Array.isArray(payload.documents)) {
        setMessage("Impossible de charger les pièces jointes ou accès non autorisé.");
        setMessageIsError(true);
        return;
      }
      setDocuments(payload.documents as DocumentItem[]);
    } catch {
      setMessage("Le service de documents est momentanément indisponible.");
      setMessageIsError(true);
    } finally {
      setLoading(false);
    }
  }

  async function togglePanel() {
    const next = !open;
    setOpen(next);
    if (next) await loadDocuments();
  }

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!selectedFile) {
      setMessage("Sélectionne un fichier avant de continuer.");
      setMessageIsError(true);
      return;
    }
    if (selectedFile.size < 1 || selectedFile.size > MAX_FILE_SIZE) {
      setMessage("Le fichier doit peser entre 1 octet et 20 Mio.");
      setMessageIsError(true);
      return;
    }

    setUploading(true);
    setMessage(null);
    let documentId: string | null = null;

    try {
      // Contrôle de confort côté navigateur. Le serveur d'analyse devra
      // recontrôler les octets réels avant de rendre le fichier disponible.
      const signature = new Uint8Array(
        await selectedFile.slice(0, 12).arrayBuffer(),
      );
      const detectedMime = detectDocumentMime(signature);
      if (!detectedMime) {
        setMessage("Format refusé. Le contenu doit être un PDF, JPEG, PNG ou WebP valide.");
        setMessageIsError(true);
        return;
      }

      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          moduleCode,
          entityType,
          entityId,
          fileName: selectedFile.name,
          mimeType: detectedMime,
          byteSize: selectedFile.size,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.document?.id || !payload?.upload?.path || !payload?.upload?.token) {
        const code = typeof payload?.error === "string" ? payload.error : "upload_failed";
        const text = code === "permission_denied"
          ? "Ton rôle ne permet pas d'ajouter un document à cette fiche."
          : code === "storage_not_configured"
            ? "Le stockage privé n'est pas encore configuré sur cet environnement."
            : code === "file_too_large"
              ? "Le fichier dépasse la limite de 20 Mio."
              : "La session de dépôt n'a pas pu être créée. Réessaie.";
        setMessage(text);
        setMessageIsError(true);
        return;
      }

      documentId = String(payload.document.id);
      const browserSupabase = createBrowserClient();
      const { error: uploadError } = await browserSupabase.storage
        .from(DOCUMENT_BUCKET)
        .uploadToSignedUrl(
          String(payload.upload.path),
          String(payload.upload.token),
          selectedFile,
          { contentType: detectedMime, cacheControl: "0", upsert: false },
        );

      if (uploadError) {
        await fetch("/api/documents", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, action: "cancel" }),
        });
        setMessage("Le stockage a refusé le fichier. Vérifie le réseau et réessaie.");
        setMessageIsError(true);
        return;
      }

      const completed = await fetch("/api/documents", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, action: "complete" }),
      });
      if (!completed.ok) {
        await fetch("/api/documents", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, action: "cancel" }),
        });
        setMessage("Le fichier a été transféré mais sa session n'a pas pu être finalisée.");
        setMessageIsError(true);
        return;
      }

      setSelectedFile(null);
      form.reset();
      await loadDocuments();
      setMessage("Le fichier est déposé. Il restera inaccessible jusqu'à la fin de son analyse de sécurité.");
      setMessageIsError(false);
    } catch {
      if (documentId) {
        await fetch("/api/documents", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, action: "cancel" }),
        }).catch(() => undefined);
      }
      setMessage("Le service de documents est momentanément indisponible.");
      setMessageIsError(true);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="min-w-48">
      <button
        type="button"
        className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-900"
        aria-expanded={open}
        aria-controls={`documents-${entityId}`}
        onClick={togglePanel}
      >
        Pièces jointes
      </button>

      {open && (
        <section
          id={`documents-${entityId}`}
          aria-label="Pièces jointes de la fiche"
          className="mt-3 w-[min(24rem,calc(100vw-3rem))] rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-slate-900">Documents associés</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Les documents sont privés. Seuls les membres ayant le droit de consulter ce module peuvent les ouvrir.
          </p>

          {canUpload && scannerEnabled && (
            <form onSubmit={submitUpload} className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                Ajouter un fichier
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={(event) => setSelectedFile(event.currentTarget.files?.[0] ?? null)}
                  className="mt-2 block w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-slate-700 hover:file:bg-slate-200"
                />
              </label>
              {selectedFile && (
                <p className="break-all text-xs text-slate-500">
                  {selectedFile.name} · {formatFileSize(selectedFile.size)}
                </p>
              )}
              <button
                type="submit"
                disabled={!selectedFile || uploading}
                className="inline-flex min-h-10 items-center rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {uploading ? "Envoi en cours…" : "Déposer le fichier"}
              </button>
              <p className="text-xs text-slate-500">
                PDF, JPEG, PNG ou WebP · 20 Mio maximum
              </p>
            </form>
          )}

          {!scannerEnabled && (
            <p role="status" className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              Le dépôt de fichiers est suspendu jusqu&apos;à la configuration du moteur d&apos;analyse antivirus. Les pièces jointes existantes restent soumises à leurs autorisations.
            </p>
          )}

          {message && (
            <p
              role={messageIsError ? "alert" : "status"}
              className={messageIsError ? "mt-3 text-xs text-red-700" : "mt-3 text-xs text-emerald-700"}
            >
              {message}
            </p>
          )}

          <div className="mt-4 border-t border-slate-100 pt-3">
            <h4 className="text-xs font-semibold text-slate-700">Fichiers enregistrés</h4>
            {loading ? (
              <p role="status" className="mt-2 text-xs text-slate-500">Chargement des documents…</p>
            ) : documents.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">Aucune pièce jointe.</p>
            ) : (
              <ul className="mt-2 divide-y divide-slate-100">
                {documents.map((document) => (
                  <li key={document.id} className="py-2">
                    <p className="break-all text-xs font-medium text-slate-800">{document.original_name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatFileSize(document.byte_size)} · {statusLabel(document.scan_status)}
                    </p>
                    {document.scan_status === "available" && (
                      <a
                        href={`/api/documents/${encodeURIComponent(document.id)}/download`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-xs font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
                      >
                        Télécharger
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
