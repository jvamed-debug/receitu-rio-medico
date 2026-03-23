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
