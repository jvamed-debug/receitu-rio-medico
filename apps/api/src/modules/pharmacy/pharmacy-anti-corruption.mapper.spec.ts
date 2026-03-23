import test from "node:test";
import assert from "node:assert/strict";

import { mapRemotePharmacyQuote } from "./pharmacy-anti-corruption.mapper";

test("normaliza payload remoto de farmacia para o contrato interno", () => {
  const result = mapRemotePharmacyQuote(
    {
      provider: "partner-x",
      id: "quote-remote-1",
      totalCents: 8400,
      checkoutUrl: "https://partner.example/checkout/1",
      items: [
        {
          id: "sku-1",
          name: "Dipirona 1g",
          quantity: "1 caixa",
          available: true,
          unitPrice: 4200,
          totalPrice: 4200,
          partner: "Farmacia A",
          leadTime: 1
        },
        {
          id: "sku-2",
          name: "Ibuprofeno",
          quantity: "1 caixa",
          status: "unavailable",
          partner: "Farmacia A"
        }
      ]
    },
    "fallback-provider"
  );

  assert.equal(result.provider, "partner-x");
  assert.equal(result.providerMode, "remote");
  assert.equal(result.availableItems, 1);
  assert.equal(result.unavailableItems, 1);
  assert.equal(result.items[0]?.sku, "sku-1");
  assert.equal(result.items[1]?.available, false);
  assert.equal(result.warnings.length > 0, true);
});
