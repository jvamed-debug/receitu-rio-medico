import test from "node:test";
import assert from "node:assert/strict";

import { PharmacyService } from "./pharmacy.service";

test("gera cotacao a partir de uma prescricao", async () => {
  const service = new PharmacyService(
    {
      getById: async () => ({
        id: "doc-1",
        type: "prescription",
        items: [
          {
            medicationName: "Dipirona",
            dosage: "1 comprimido",
            quantity: "1 caixa"
          }
        ]
      })
    } as never,
    {
      quotePrescription: async (input: {
        documentId: string;
        items: Array<{ medicationName: string; quantity?: string }>;
      }) => ({
        provider: "mock-pharmacy",
        providerMode: "mock",
        quoteId: `quote-${input.documentId}`,
        checkoutUrl: "https://pharmacy.receituario.local/quotes/doc-1",
        totalPriceCents: 2500,
        currency: "BRL",
        unavailableItems: 0,
        availableItems: 1,
        warnings: [],
        sourceReference: "mock:doc-1",
        items: [
          {
            medicationName: input.items[0]?.medicationName ?? "",
            quantity: input.items[0]?.quantity,
            available: true,
            unitPriceCents: 2500,
            totalPriceCents: 2500
          }
        ],
        createdAt: "2026-03-23T12:00:00.000Z"
      })
    } as never
  );

  const result = await service.quotePrescription("doc-1");

  assert.equal(result.provider, "mock-pharmacy");
  assert.equal(result.items[0]?.medicationName, "Dipirona");
  assert.equal(result.warnings.length, 0);
});
