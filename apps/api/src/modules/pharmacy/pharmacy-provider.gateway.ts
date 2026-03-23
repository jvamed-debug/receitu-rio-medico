import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { PharmacyQuote } from "@receituario/domain";

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
}
