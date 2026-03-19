export interface SignatureSession {
  id: string;
  professionalId: string;
  provider: "icp-brasil-vendor" | "govbr-vendor";
  documentId: string;
  status: "pending" | "authorized" | "signed" | "expired" | "failed";
  expiresAt?: string;
  createdAt: string;
}

export interface SignatureWindow {
  id: string;
  professionalId: string;
  provider: "icp-brasil-vendor" | "govbr-vendor";
  durationMinutes: number;
  validUntil: string;
  createdAt: string;
}

