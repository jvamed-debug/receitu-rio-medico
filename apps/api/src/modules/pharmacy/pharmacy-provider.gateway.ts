import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PharmacyOrder, PharmacyPartnerOffer, PharmacyQuote } from "@receituario/domain";

import { mapRemotePharmacyQuote } from "./pharmacy-anti-corruption.mapper";

@Injectable()
export class PharmacyProviderGateway {
  constructor(private readonly configService: ConfigService) {}

  async quotePrescription(input: {
    documentId: string;
    routeStrategy?: "best-value" | "lowest-price" | "fastest";
    preferredPartnerKey?: string;
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
    routeStrategy?: "best-value" | "lowest-price" | "fastest";
    preferredPartnerKey?: string;
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
    routeStrategy?: "best-value" | "lowest-price" | "fastest";
    preferredPartnerKey?: string;
    items: Array<{
      medicationName: string;
      quantity?: string;
    }>;
  }): PharmacyQuote {
    const baseUrl =
      this.configService.get<string>("PHARMACY_PROVIDER_CHECKOUT_BASE_URL") ??
      "https://pharmacy.receituario.local";
    const routeStrategy = input.routeStrategy ?? "best-value";
    const partnerOffers = buildMockPartnerOffers({
      documentId: input.documentId,
      items: input.items,
      baseUrl
    });
    const selectedOffer = selectPartnerOffer(
      partnerOffers,
      routeStrategy,
      input.preferredPartnerKey
    );
    const items = input.items.map((item, index) => {
      const unitPriceCents = 2500 + index * 700;
      return {
        medicationName: item.medicationName,
        quantity: item.quantity,
        available: !selectedOffer.warnings.some((warning) => warning.includes("indisponiveis")),
        partnerName: selectedOffer.partnerName,
        unitPriceCents,
        totalPriceCents: unitPriceCents
      };
    });

    return {
      provider: "mock-pharmacy",
      providerMode: "mock",
      quoteId: `quote-${input.documentId}`,
      selectedPartnerKey: selectedOffer.partnerKey,
      routeStrategy,
      checkoutUrl: selectedOffer.checkoutUrl,
      partnerOrderUrl: selectedOffer.partnerOrderUrl,
      totalPriceCents: selectedOffer.totalPriceCents,
      currency: "BRL",
      unavailableItems: selectedOffer.unavailableItems,
      availableItems: selectedOffer.availableItems,
      warnings: selectedOffer.warnings,
      alternatives: partnerOffers,
      sourceReference: `mock:${input.documentId}`,
      items,
      createdAt: new Date().toISOString()
    };
  }

  private buildMockOrder(input: {
    documentId: string;
    quote: PharmacyQuote;
    routeStrategy?: "best-value" | "lowest-price" | "fastest";
    preferredPartnerKey?: string;
  }): PharmacyOrder {
    const selectedOffer =
      (input.quote.alternatives ?? []).length > 0
        ? selectPartnerOffer(
            input.quote.alternatives ?? [],
            input.routeStrategy ?? input.quote.routeStrategy ?? "best-value",
            input.preferredPartnerKey ?? input.quote.selectedPartnerKey
          )
        : {
            partnerKey:
              input.preferredPartnerKey ?? input.quote.selectedPartnerKey ?? "default",
            partnerName: "Parceiro selecionado",
            checkoutUrl: input.quote.checkoutUrl,
            partnerOrderUrl: input.quote.partnerOrderUrl,
            totalPriceCents: input.quote.totalPriceCents,
            currency: input.quote.currency,
            availableItems: input.quote.availableItems,
            unavailableItems: input.quote.unavailableItems,
            warnings: input.quote.warnings
          };

    return {
      id: `mock-order-${input.quote.quoteId}`,
      documentId: input.documentId,
      provider: input.quote.provider,
      providerMode: input.quote.providerMode,
      partnerKey: selectedOffer.partnerKey,
      quoteId: input.quote.quoteId,
      routeStrategy: input.routeStrategy ?? input.quote.routeStrategy,
      status: selectedOffer.checkoutUrl ? "checkout_ready" : "pending",
      externalReference: `mock-order-${input.quote.quoteId}`,
      checkoutUrl: selectedOffer.checkoutUrl ?? input.quote.checkoutUrl,
      partnerOrderUrl: selectedOffer.partnerOrderUrl ?? input.quote.partnerOrderUrl,
      totalPriceCents: selectedOffer.totalPriceCents ?? input.quote.totalPriceCents,
      currency: selectedOffer.currency ?? input.quote.currency,
      items: input.quote.items,
      warnings: selectedOffer.warnings.length > 0 ? selectedOffer.warnings : input.quote.warnings,
      metadata: {
        sourceReference: input.quote.sourceReference,
        partnerName: selectedOffer.partnerName
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  private async executeRemoteQuote(input: {
    documentId: string;
    routeStrategy?: "best-value" | "lowest-price" | "fastest";
    preferredPartnerKey?: string;
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

    const quote = mapRemotePharmacyQuote(await response.json(), providerName);
    const selectedOffer = selectPartnerOffer(
      quote.alternatives ?? [],
      input.routeStrategy ?? quote.routeStrategy ?? "best-value",
      input.preferredPartnerKey ?? quote.selectedPartnerKey
    );

    return {
      ...quote,
      selectedPartnerKey: selectedOffer.partnerKey,
      routeStrategy: input.routeStrategy ?? quote.routeStrategy ?? "best-value",
      checkoutUrl: selectedOffer.checkoutUrl ?? quote.checkoutUrl,
      partnerOrderUrl: selectedOffer.partnerOrderUrl ?? quote.partnerOrderUrl,
      totalPriceCents: selectedOffer.totalPriceCents ?? quote.totalPriceCents,
      availableItems: selectedOffer.availableItems ?? quote.availableItems,
      unavailableItems: selectedOffer.unavailableItems ?? quote.unavailableItems,
      warnings: selectedOffer.warnings.length > 0 ? selectedOffer.warnings : quote.warnings
    };
  }

  private async executeRemoteOrder(input: {
    documentId: string;
    quote: PharmacyQuote;
    routeStrategy?: "best-value" | "lowest-price" | "fastest";
    preferredPartnerKey?: string;
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
        partnerKey: input.preferredPartnerKey ?? input.quote.selectedPartnerKey,
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
      partnerKey:
        typeof payload.partnerKey === "string" && payload.partnerKey.length > 0
          ? payload.partnerKey
          : quote.selectedPartnerKey,
      quoteId:
        typeof payload.quoteId === "string" && payload.quoteId.length > 0
        ? payload.quoteId
        : quote.quoteId,
      routeStrategy: quote.routeStrategy,
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

function buildMockPartnerOffers(input: {
  documentId: string;
  items: Array<{
    medicationName: string;
    quantity?: string;
  }>;
  baseUrl: string;
}): PharmacyPartnerOffer[] {
  const itemCount = Math.max(input.items.length, 1);
  const rootUrl = input.baseUrl.replace(/\/$/, "");

  return [
    {
      partnerKey: "fast-meds",
      partnerName: "Fast Meds",
      checkoutUrl: `${rootUrl}/quotes/${input.documentId}?partner=fast-meds`,
      partnerOrderUrl: `${rootUrl}/partners/fast-meds/orders/${input.documentId}`,
      totalPriceCents: 3400 * itemCount,
      currency: "BRL",
      availableItems: itemCount,
      unavailableItems: 0,
      leadTimeDays: 1,
      warnings: []
    },
    {
      partnerKey: "eco-farma",
      partnerName: "Eco Farma",
      checkoutUrl: `${rootUrl}/quotes/${input.documentId}?partner=eco-farma`,
      partnerOrderUrl: `${rootUrl}/partners/eco-farma/orders/${input.documentId}`,
      totalPriceCents: 2900 * itemCount,
      currency: "BRL",
      availableItems: itemCount,
      unavailableItems: 0,
      leadTimeDays: 3,
      warnings: []
    },
    {
      partnerKey: "care-express",
      partnerName: "Care Express",
      checkoutUrl: `${rootUrl}/quotes/${input.documentId}?partner=care-express`,
      partnerOrderUrl: `${rootUrl}/partners/care-express/orders/${input.documentId}`,
      totalPriceCents: 3100 * itemCount,
      currency: "BRL",
      availableItems: Math.max(itemCount - 1, 0),
      unavailableItems: itemCount > 1 ? 1 : 0,
      leadTimeDays: 2,
      warnings: itemCount > 1 ? ["Existem itens indisponiveis nesta rede parceira."] : []
    }
  ];
}

function selectPartnerOffer(
  offers: PharmacyPartnerOffer[],
  routeStrategy: "best-value" | "lowest-price" | "fastest",
  preferredPartnerKey?: string
) {
  if (offers.length === 0) {
    return {
      partnerKey: preferredPartnerKey ?? "default",
      partnerName: "Parceiro padrao",
      totalPriceCents: 0,
      currency: "BRL",
      availableItems: 0,
      unavailableItems: 0,
      warnings: ["Nenhuma oferta de parceiro disponivel para roteamento."]
    } satisfies PharmacyPartnerOffer;
  }

  if (preferredPartnerKey) {
    const preferred = offers.find((offer) => offer.partnerKey === preferredPartnerKey);
    if (preferred) {
      return preferred;
    }
  }

  const sorted = [...offers].sort((left, right) => {
    if (routeStrategy === "lowest-price") {
      return left.totalPriceCents - right.totalPriceCents;
    }

    if (routeStrategy === "fastest") {
      return (left.leadTimeDays ?? 99) - (right.leadTimeDays ?? 99);
    }

    const leftScore =
      left.totalPriceCents + left.unavailableItems * 2000 + (left.leadTimeDays ?? 0) * 200;
    const rightScore =
      right.totalPriceCents + right.unavailableItems * 2000 + (right.leadTimeDays ?? 0) * 200;
    return leftScore - rightScore;
  });

  return sorted[0]!;
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
