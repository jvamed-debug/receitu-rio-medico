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
