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
