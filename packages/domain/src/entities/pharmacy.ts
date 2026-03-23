export interface PharmacyQuoteLine {
  medicationName: string;
  quantity?: string;
  available: boolean;
  unitPriceCents?: number;
  totalPriceCents?: number;
}

export interface PharmacyQuote {
  provider: string;
  quoteId: string;
  checkoutUrl?: string;
  totalPriceCents: number;
  currency: string;
  items: PharmacyQuoteLine[];
  createdAt: string;
}
