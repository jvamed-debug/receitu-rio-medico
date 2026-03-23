import test from "node:test";
import assert from "node:assert/strict";

import { PharmacyProviderGateway } from "./pharmacy-provider.gateway";

test("gateway mock de farmacia gera cotacao para prescricao", async () => {
  const gateway = new PharmacyProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "PHARMACY_PROVIDER_MODE":
          return "mock";
        case "PHARMACY_PROVIDER_CHECKOUT_BASE_URL":
          return "https://pharmacy.receituario.local";
        default:
          return undefined;
      }
    }
  } as never);

  const result = await gateway.quotePrescription({
    documentId: "doc-1",
    items: [{ medicationName: "Dipirona" }]
  });

  assert.equal(result.provider, "mock-pharmacy");
  assert.equal(result.providerMode, "mock");
  assert.equal(result.items.length, 1);
  assert.equal(result.availableItems, 1);
  assert.equal(result.unavailableItems, 0);
  assert.equal(result.checkoutUrl, "https://pharmacy.receituario.local/quotes/doc-1");
});

test("gateway mock de farmacia gera pedido e status sincronizado", async () => {
  const gateway = new PharmacyProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "PHARMACY_PROVIDER_MODE":
          return "mock";
        case "PHARMACY_PROVIDER_CHECKOUT_BASE_URL":
          return "https://pharmacy.receituario.local";
        default:
          return undefined;
      }
    }
  } as never);

  const order = await gateway.createOrderFromQuote({
    documentId: "doc-1",
    quote: {
      provider: "mock-pharmacy",
      providerMode: "mock",
      quoteId: "quote-doc-1",
      checkoutUrl: "https://pharmacy.receituario.local/quotes/doc-1",
      partnerOrderUrl: "https://pharmacy.receituario.local/partners/mock/orders/doc-1",
      totalPriceCents: 2500,
      currency: "BRL",
      unavailableItems: 0,
      availableItems: 1,
      warnings: [],
      items: [],
      createdAt: "2026-03-23T12:00:00.000Z"
    }
  });

  const status = await gateway.getOrderStatus({
    orderId: "order-1",
    externalReference: order.externalReference
  });

  assert.equal(order.status, "checkout_ready");
  assert.equal(status.status, "confirmed");
});
