import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PharmacyOrder, PharmacyQuote } from "@receituario/domain";

import { mapRemotePharmacyQuote } from "./pharmacy-anti-corruption.mapper";

@Injectable()
export class PharmacyProviderGateway {
  constructor(private readonly configService: ConfigService) {}

  async quotePrescription(input: {
    documentId: string;
    items: Array<{
      medicationName: string;
      quantity?: string;
    }>;
  }): Promise<PharmacyQuote> {
    const mode =
      this.configService.get<string>("PHARMACY_PROVIDER_MODE")?.toLowerCase() ?? "mock";

    if (mode === "mock") {
      return this.buildMockQuote(input);
    }

    return this.executeRemoteQuote(input);
  }

  async createOrderFromQuote(input: {
    documentId: string;
    quote: PharmacyQuote;
  }): Promise<PharmacyOrder> {
    const mode =
      this.configService.get<string>("PHARMACY_PROVIDER_MODE")?.toLowerCase() ?? "mock";

    if (mode === "mock") {
      return this.buildMockOrder(input);
    }

    return this.executeRemoteOrder(input);
  }

  async getOrderStatus(input: {
    orderId: string;
    externalReference?: string | null;
  }): Promise<Pick<PharmacyOrder, "status" | "externalReference" | "partnerOrderUrl" | "checkoutUrl" | "warnings" | "metadata">> {
    const mode =
      this.configService.get<string>("PHARMACY_PROVIDER_MODE")?.toLowerCase() ?? "mock";

    if (mode === "mock") {
      return {
        status: "confirmed",
        externalReference: input.externalReference ?? `mock-order-${input.orderId}`,
        partnerOrderUrl: `${(
          this.configService.get<string>("PHARMACY_PROVIDER_CHECKOUT_BASE_URL") ??
          "https://pharmacy.receituario.local"
        ).replace(/\/$/, "")}/partners/mock/orders/${input.orderId}`,
        checkoutUrl: undefined,
        warnings: [],
        metadata: {
          providerMode: "mock",
          syncedAt: new Date().toISOString()
        }
      };
    }

    return this.executeRemoteOrderStatusLookup(input);
  }

  private buildMockQuote(input: {
    documentId: string;
    items: Array<{
      medicationName: string;
      quantity?: string;
    }>;
  }): PharmacyQuote {
    const baseUrl =
      this.configService.get<string>("PHARMACY_PROVIDER_CHECKOUT_BASE_URL") ??
      "https://pharmacy.receituario.local";
    const items = input.items.map((item, index) => {
      const unitPriceCents = 2500 + index * 700;
      return {
        medicationName: item.medicationName,
        quantity: item.quantity,
        available: true,
        unitPriceCents,
        totalPriceCents: unitPriceCents
      };
    });
    const totalPriceCents = items.reduce(
      (total, item) => total + (item.totalPriceCents ?? 0),
      0
    );

    return {
      provider: "mock-pharmacy",
      providerMode: "mock",
      quoteId: `quote-${input.documentId}`,
      checkoutUrl: `${baseUrl.replace(/\/$/, "")}/quotes/${input.documentId}`,
      partnerOrderUrl: `${baseUrl.replace(/\/$/, "")}/partners/mock/orders/${input.documentId}`,
      totalPriceCents,
      currency: "BRL",
      unavailableItems: 0,
      availableItems: items.length,
      warnings: [],
      sourceReference: `mock:${input.documentId}`,
      items,
      createdAt: new Date().toISOString()
    };
  }

  private buildMockOrder(input: {
    documentId: string;
    quote: PharmacyQuote;
  }): PharmacyOrder {
    return {
      id: `mock-order-${input.quote.quoteId}`,
      documentId: input.documentId,
      provider: input.quote.provider,
      providerMode: input.quote.providerMode,
      quoteId: input.quote.quoteId,
      status: input.quote.checkoutUrl ? "checkout_ready" : "pending",
      externalReference: `mock-order-${input.quote.quoteId}`,
      checkoutUrl: input.quote.checkoutUrl,
      partnerOrderUrl: input.quote.partnerOrderUrl,
      totalPriceCents: input.quote.totalPriceCents,
      currency: input.quote.currency,
      items: input.quote.items,
      warnings: input.quote.warnings,
      metadata: {
        sourceReference: input.quote.sourceReference
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private async executeRemoteQuote(input: {
    documentId: string;
    items: Array<{
      medicationName: string;
      quantity?: string;
    }>;
  }) {
    const baseUrl = this.configService.get<string>("PHARMACY_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("PHARMACY_PROVIDER_API_KEY");

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider farmaceutico configurado sem base URL ou API key"
      );
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/quotes`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Provider farmaceutico respondeu com status ${response.status}`
      );
    }

    const providerName =
      this.configService.get<string>("PHARMACY_PROVIDER_NAME") ?? "remote-pharmacy";

    return mapRemotePharmacyQuote(await response.json(), providerName);
  }

  private async executeRemoteOrder(input: {
    documentId: string;
    quote: PharmacyQuote;
  }): Promise<PharmacyOrder> {
    const baseUrl = this.configService.get<string>("PHARMACY_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("PHARMACY_PROVIDER_API_KEY");

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider farmaceutico configurado sem base URL ou API key"
      );
    }

    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/orders`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        documentId: input.documentId,
        quoteId: input.quote.quoteId,
        items: input.quote.items,
        totalPriceCents: input.quote.totalPriceCents,
        currency: input.quote.currency
      })
    });

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Provider farmaceutico respondeu com status ${response.status} ao criar pedido`
      );
    }

    const payload = (await response.json()) as Record<string, unknown>;
    return mapRemotePharmacyOrder(payload, input.documentId, input.quote);
  }

  private async executeRemoteOrderStatusLookup(input: {
    orderId: string;
    externalReference?: string | null;
  }) {
    const baseUrl = this.configService.get<string>("PHARMACY_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("PHARMACY_PROVIDER_API_KEY");

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider farmaceutico configurado sem base URL ou API key"
      );
    }

    const lookupRef = input.externalReference ?? input.orderId;
    const response = await fetch(
      `${baseUrl.replace(/\/$/, "")}/orders/${encodeURIComponent(lookupRef)}`,
      {
        method: "GET",
        headers: {
          authorization: `Bearer ${apiKey}`
        }
      }
    );

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `Provider farmaceutico respondeu com status ${response.status} ao consultar pedido`
      );
    }

    return mapRemotePharmacyOrderStatus(await response.json(), lookupRef);
  }
}

function mapRemotePharmacyOrder(
  payload: Record<string, unknown>,
  documentId: string,
  quote: PharmacyQuote
): PharmacyOrder {
  const items = Array.isArray(payload.items)
    ? (payload.items as PharmacyQuote["items"])
    : quote.items;
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((item): item is string => typeof item === "string")
    : quote.warnings;

  return {
    id:
      typeof payload.orderId === "string" && payload.orderId.length > 0
        ? payload.orderId
        : `remote-order-${quote.quoteId}`,
    documentId,
    provider:
      typeof payload.provider === "string" && payload.provider.length > 0
        ? payload.provider
        : quote.provider,
    providerMode: "remote",
    quoteId:
      typeof payload.quoteId === "string" && payload.quoteId.length > 0
        ? payload.quoteId
        : quote.quoteId,
    status: normalizeOrderStatus(payload.status),
    externalReference:
      typeof payload.externalReference === "string"
        ? payload.externalReference
        : undefined,
    checkoutUrl:
      typeof payload.checkoutUrl === "string" ? payload.checkoutUrl : quote.checkoutUrl,
    partnerOrderUrl:
      typeof payload.partnerOrderUrl === "string"
        ? payload.partnerOrderUrl
        : quote.partnerOrderUrl,
    totalPriceCents:
      typeof payload.totalPriceCents === "number"
        ? payload.totalPriceCents
        : quote.totalPriceCents,
    currency:
      typeof payload.currency === "string" ? payload.currency : quote.currency,
    items,
    warnings,
    metadata:
      payload.metadata && typeof payload.metadata === "object"
        ? (payload.metadata as Record<string, unknown>)
        : {},
    createdAt:
      typeof payload.createdAt === "string" ? payload.createdAt : new Date().toISOString(),
    updatedAt:
      typeof payload.updatedAt === "string" ? payload.updatedAt : new Date().toISOString()
  };
}

function mapRemotePharmacyOrderStatus(payload: unknown, fallbackReference: string) {
  const record = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter((item): item is string => typeof item === "string")
    : [];

  return {
    status: normalizeOrderStatus(record.status),
    externalReference:
      typeof record.externalReference === "string"
        ? record.externalReference
        : fallbackReference,
    partnerOrderUrl:
      typeof record.partnerOrderUrl === "string" ? record.partnerOrderUrl : undefined,
    checkoutUrl:
      typeof record.checkoutUrl === "string" ? record.checkoutUrl : undefined,
    warnings,
    metadata:
      record.metadata && typeof record.metadata === "object"
        ? (record.metadata as Record<string, unknown>)
        : {}
  };
}

function normalizeOrderStatus(status: unknown): PharmacyOrder["status"] {
  const normalized = typeof status === "string" ? status.toLowerCase() : "pending";

  switch (normalized) {
    case "checkout_ready":
    case "checkout-ready":
      return "checkout_ready";
    case "order_placed":
    case "placed":
    case "order-placed":
      return "order_placed";
    case "confirmed":
      return "confirmed";
    case "fulfilled":
    case "completed":
      return "fulfilled";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "failed":
    case "error":
      return "failed";
    default:
      return "pending";
  }
}
