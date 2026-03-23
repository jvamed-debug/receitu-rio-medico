export type PaymentAuthorizationInput = {
  billingId: string;
  appointmentId: string;
  amountCents: number;
  currency: string;
  description: string;
  paymentProvider: string;
  existingExternalReference?: string | null;
};

export type PaymentAuthorizationResult = {
  externalReference: string;
  authorizedAt: string;
  providerMetadata: Record<string, unknown>;
};

export type PaymentCheckoutInput = {
  billingId: string;
  appointmentId: string;
  amountCents: number;
  currency: string;
  description: string;
  paymentProvider: string;
  existingExternalReference?: string | null;
};

export type PaymentCheckoutResult = {
  externalReference: string;
  checkoutUrl: string;
  providerMetadata: Record<string, unknown>;
};

export type PaymentCaptureInput = {
  billingId: string;
  appointmentId: string;
  externalReference?: string | null;
  amountCents: number;
  currency: string;
  paymentProvider: string;
};

export type PaymentCaptureResult = {
  externalReference: string;
  paidAt: string;
  providerMetadata: Record<string, unknown>;
};

export type PaymentProviderReadinessResult = {
  mode: "mock" | "remote";
  checkedAt: string;
  configured: boolean;
  webhookVerificationMode: "shared-secret" | "hmac";
  capabilities: {
    authorize: boolean;
    capture: boolean;
    checkout: boolean;
    webhookSupport: boolean;
    hmacVerification: boolean;
  };
  connectivity: {
    status: "mock" | "ok" | "degraded" | "unavailable";
    httpStatus?: number;
  };
  issues: string[];
  metadata: Record<string, unknown>;
};
