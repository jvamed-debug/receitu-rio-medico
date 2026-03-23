import { ServiceUnavailableException } from "@nestjs/common";
import type { PharmacyQuote } from "@receituario/domain";

type RemotePharmacyQuotePayload = {
  provider?: unknown;
  quoteId?: unknown;
  id?: unknown;
  checkoutUrl?: unknown;
  partnerOrderUrl?: unknown;
  totalPriceCents?: unknown;
  totalCents?: unknown;
  currency?: unknown;
  sourceReference?: unknown;
  warnings?: unknown;
  items?: unknown;
};

export function mapRemotePharmacyQuote(
  payload: unknown,
  fallbackProvider: string
): PharmacyQuote {
  if (!payload || typeof payload !== "object") {
    throw new ServiceUnavailableException(
      "Provider farmaceutico retornou payload invalido"
    );
  }

  const quote = payload as RemotePharmacyQuotePayload;
  const items = Array.isArray(quote.items)
    ? quote.items.map((item, index) => mapRemotePharmacyQuoteLine(item, index))
    : [];

  const normalized: PharmacyQuote = {
    provider: readString(quote.provider) ?? fallbackProvider,
    providerMode: "remote",
    quoteId: readString(quote.quoteId) ?? readString(quote.id) ?? `remote-${Date.now()}`,
    checkoutUrl: readString(quote.checkoutUrl),
    partnerOrderUrl: readString(quote.partnerOrderUrl),
    totalPriceCents:
      readNumber(quote.totalPriceCents) ??
      readNumber(quote.totalCents) ??
      items.reduce((total, item) => total + (item.totalPriceCents ?? 0), 0),
    currency: readString(quote.currency) ?? "BRL",
    availableItems: items.filter((item) => item.available).length,
    unavailableItems: items.filter((item) => !item.available).length,
    warnings: Array.isArray(quote.warnings)
      ? quote.warnings.filter((warning): warning is string => typeof warning === "string")
      : deriveWarnings(items),
    sourceReference: readString(quote.sourceReference),
    items,
    createdAt: new Date().toISOString()
  };

  return normalized;
}

function mapRemotePharmacyQuoteLine(input: unknown, index: number) {
  if (!input || typeof input !== "object") {
    return {
      sku: `unknown-${index + 1}`,
      medicationName: `Item ${index + 1}`,
      available: false,
      availabilityLabel: "payload_invalido",
      partnerName: "provider-externo"
    };
  }

  const item = input as Record<string, unknown>;
  const available = readBoolean(item.available) ?? (readString(item.status) !== "unavailable");

  return {
    sku: readString(item.sku) ?? readString(item.id),
    medicationName:
      readString(item.medicationName) ??
      readString(item.name) ??
      `Item ${index + 1}`,
    quantity: readString(item.quantity),
    available,
    availabilityLabel: readString(item.availabilityLabel) ?? readString(item.status),
    partnerName: readString(item.partnerName) ?? readString(item.partner),
    unitPriceCents: readNumber(item.unitPriceCents) ?? readNumber(item.unitPrice),
    totalPriceCents: readNumber(item.totalPriceCents) ?? readNumber(item.totalPrice),
    leadTimeDays: readNumber(item.leadTimeDays) ?? readNumber(item.leadTime)
  };
}

function deriveWarnings(items: PharmacyQuote["items"]) {
  const warnings: string[] = [];

  if (items.some((item) => !item.available)) {
    warnings.push("Nem todos os itens estao disponiveis na cotacao atual.");
  }

  if (items.some((item) => item.leadTimeDays && item.leadTimeDays > 3)) {
    warnings.push("Alguns itens possuem prazo de entrega acima do esperado.");
  }

  return warnings;
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readBoolean(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}
