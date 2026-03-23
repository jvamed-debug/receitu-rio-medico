import { SignatureProvider } from "@prisma/client";

export type SignatureProviderExecutionInput = {
  sessionId: string;
  documentId: string;
  professionalId: string;
  provider: SignatureProvider;
  signatureLevel?: string | null;
  policyVersion?: string | null;
  expiresAt?: string | null;
  requestContext?: {
    ip?: string;
    userAgent?: string;
    origin?: string;
  };
  callbackUrl?: string;
  callbackSecret?: string;
};

export type SignatureProviderExecutionResult = {
  externalReference: string;
  signedAt: string;
  evidence: Record<string, unknown>;
};

export type SignatureProviderStatusResult = {
  status: "pending" | "signed" | "failed";
  externalReference?: string;
  signedAt?: string;
  providerStatus?: string;
  evidence: Record<string, unknown>;
};
