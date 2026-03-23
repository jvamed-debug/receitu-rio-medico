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

export type SignatureProviderReadinessResult = {
  mode: "mock" | "remote";
  provider: SignatureProvider;
  checkedAt: string;
  configured: boolean;
  callbackVerificationMode: "shared-secret" | "hmac";
  capabilities: {
    createSignature: boolean;
    statusLookup: boolean;
    callbackSupport: boolean;
    hmacVerification: boolean;
  };
  connectivity: {
    status: "mock" | "ok" | "degraded" | "unavailable";
    httpStatus?: number;
  };
  issues: string[];
  metadata: Record<string, unknown>;
};
