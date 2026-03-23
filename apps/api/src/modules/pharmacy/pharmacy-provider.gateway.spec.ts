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
  assert.equal(result.selectedPartnerKey, "eco-farma");
  assert.equal(result.alternatives?.length, 3);
  assert.equal(result.checkoutUrl, "https://pharmacy.receituario.local/quotes/doc-1?partner=eco-farma");
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
      selectedPartnerKey: "eco-farma",
      routeStrategy: "best-value",
      checkoutUrl: "https://pharmacy.receituario.local/quotes/doc-1?partner=eco-farma",
      partnerOrderUrl: "https://pharmacy.receituario.local/partners/eco-farma/orders/doc-1",
      totalPriceCents: 2500,
      currency: "BRL",
      unavailableItems: 0,
      availableItems: 1,
      warnings: [],
      alternatives: [],
      items: [],
      createdAt: "2026-03-23T12:00:00.000Z"
    }
  });

  const status = await gateway.getOrderStatus({
    orderId: "order-1",
    externalReference: order.externalReference
  });

  assert.equal(order.status, "checkout_ready");
  assert.equal(order.partnerKey, "eco-farma");
  assert.equal(status.status, "confirmed");
});

test("gateway mock roteia para parceiro mais rapido quando solicitado", async () => {
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
    routeStrategy: "fastest",
    items: [{ medicationName: "Dipirona" }]
  });

  assert.equal(result.selectedPartnerKey, "fast-meds");
});

test("gateway de farmacia expõe readiness em modo mock", async () => {
  const gateway = new PharmacyProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "PHARMACY_PROVIDER_MODE":
          return "mock";
        case "PHARMACY_PROVIDER_NAME":
          return "mock-pharmacy";
        default:
          return undefined;
      }
    }
  } as never);

  const result = await gateway.getReadiness();

  assert.equal(result.mode, "mock");
  assert.equal(result.configured, true);
  assert.equal(result.connectivity.status, "mock");
  assert.equal(result.issues.length, 0);
});

test("gateway de farmacia sinaliza configuracao faltante em modo remoto", async () => {
  const gateway = new PharmacyProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "PHARMACY_PROVIDER_MODE":
          return "remote";
        case "PHARMACY_PROVIDER_NAME":
          return "partner-pharmacy";
        default:
          return undefined;
      }
    }
  } as never);

  const result = await gateway.getReadiness();

  assert.equal(result.mode, "remote");
  assert.equal(result.configured, false);
  assert.equal(result.connectivity.status, "unavailable");
  assert.equal(result.issues.length, 2);
});
