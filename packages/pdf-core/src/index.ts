export interface PdfRenderRequest {
  documentId: string;
  html: string;
  layoutVersion: string;
}

export interface PdfArtifact {
  id: string;
  documentId: string;
  storageKey: string;
  sha256: string;
  createdAt: string;
}

