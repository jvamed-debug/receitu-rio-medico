export interface PharmacyQuoteLine {
  sku?: string;
  medicationName: string;
  quantity?: string;
  available: boolean;
  availabilityLabel?: string;
  partnerName?: string;
  unitPriceCents?: number;
  totalPriceCents?: number;
  leadTimeDays?: number;
}

export interface PharmacyQuote {
  provider: string;
  providerMode?: "mock" | "remote";
  quoteId: string;
  checkoutUrl?: string;
  partnerOrderUrl?: string;
  totalPriceCents: number;
  currency: string;
  unavailableItems: number;
  availableItems: number;
  warnings: string[];
  sourceReference?: string;
  items: PharmacyQuoteLine[];
  createdAt: string;
}

export type PharmacyOrderStatus =
  | "pending"
  | "checkout_ready"
  | "order_placed"
  | "confirmed"
  | "fulfilled"
  | "cancelled"
  | "failed";

export interface PharmacyOrder {
  id: string;
  documentId: string;
  provider: string;
  providerMode?: "mock" | "remote";
  quoteId: string;
  status: PharmacyOrderStatus;
  externalReference?: string;
  checkoutUrl?: string;
  partnerOrderUrl?: string;
  totalPriceCents: number;
  currency: string;
  items: PharmacyQuoteLine[];
  warnings: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
