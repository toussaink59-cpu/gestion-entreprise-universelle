"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
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

export function DocumentAttachments({
  companyId,
  moduleCode,
  entityType,
  entityId,
  canUpload,
  scannerEnabled,
}: Props) {
  const locale = useLocale();
  const t = useTranslations("Documents");
  const numberLocale = locale === "en" ? "en-GB" : "fr-FR";
  const formatFileSize = (size: number) => {
    const formatted = (value: number, digits: number) => new Intl.NumberFormat(numberLocale, { maximumFractionDigits: digits }).format(value);
    if (size < 1024) return `${formatted(size, 0)} ${t("sizeBytes")}`;
    if (size < 1024 * 1024) return `${formatted(size / 1024, 0)} ${t("sizeKilobytes")}`;
    return `${formatted(size / (1024 * 1024), 1)} ${t("sizeMegabytes")}`;
  };
  const statusLabel = (status: DocumentItem["scan_status"]) => t(`status.${status}`);
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
        setMessage(t("messages.loadFailed"));
        setMessageIsError(true);
        return;
      }
      setDocuments(payload.documents as DocumentItem[]);
    } catch {
      setMessage(t("messages.serviceUnavailable"));
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
      setMessage(t("messages.selectFile"));
      setMessageIsError(true);
      return;
    }
    if (selectedFile.size < 1 || selectedFile.size > MAX_FILE_SIZE) {
      setMessage(t("messages.invalidSize"));
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
        setMessage(t("messages.invalidFormat"));
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
          ? t("messages.permissionDenied")
          : code === "storage_not_configured"
            ? t("messages.storageMissing")
            : code === "file_too_large"
              ? t("messages.tooLarge")
              : t("messages.sessionFailed");
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
        setMessage(t("messages.uploadFailed"));
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
        setMessage(t("messages.completionFailed"));
        setMessageIsError(true);
        return;
      }

      setSelectedFile(null);
      form.reset();
      await loadDocuments();
      setMessage(t("messages.scanPending"));
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
        {t("trigger")}
      </button>

      {open && (
        <section
          id={`documents-${entityId}`}
          aria-label={t("ariaLabel")}
          className="mt-3 w-[min(24rem,calc(100vw-3rem))] rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
        >
          <h3 className="text-sm font-semibold text-slate-900">{t("title")}</h3>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            {t("privacy")}
          </p>

          {canUpload && scannerEnabled && (
            <form onSubmit={submitUpload} className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-700">
                {t("addFile")}
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
                {uploading ? t("uploadingFile") : t("uploadFile")}
              </button>
              <p className="text-xs text-slate-500">
                {t("allowedTypes")}
              </p>
            </form>
          )}

          {!scannerEnabled && (
            <p role="status" className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
              {t("scannerDisabled")}
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
            <h4 className="text-xs font-semibold text-slate-700">{t("storedFiles")}</h4>
            {loading ? (
              <p role="status" className="mt-2 text-xs text-slate-500">{t("loading")}</p>
            ) : documents.length === 0 ? (
              <p className="mt-2 text-xs text-slate-500">{t("empty")}</p>
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
