import test from "node:test";
import assert from "node:assert/strict";

import { PharmacyService } from "./pharmacy.service";

test("gera cotacao a partir de uma prescricao", async () => {
  const service = new PharmacyService(
    {
      pharmacyOrder: {
        create: async () => undefined,
        findUnique: async () => undefined,
        update: async () => undefined
      }
    } as never,
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
        routeStrategy?: string;
        items: Array<{ medicationName: string; quantity?: string }>;
      }) => ({
        provider: "mock-pharmacy",
        providerMode: "mock",
        quoteId: `quote-${input.documentId}`,
        selectedPartnerKey: "eco-farma",
        routeStrategy: input.routeStrategy ?? "best-value",
        checkoutUrl: "https://pharmacy.receituario.local/quotes/doc-1?partner=eco-farma",
        totalPriceCents: 2500,
        currency: "BRL",
        unavailableItems: 0,
        availableItems: 1,
        warnings: [],
        alternatives: [],
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
  assert.equal(result.selectedPartnerKey, "eco-farma");
  assert.equal(result.warnings.length, 0);
});

test("cria e sincroniza pedido farmaceutico", async () => {
  let updatedStatus: string | undefined;

  const service = new PharmacyService(
    {
      pharmacyOrder: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "order-1",
          documentId: data.documentId,
          provider: data.provider,
          providerMode: data.providerMode,
          quoteId: data.quoteId,
          status: data.status,
          externalReference: data.externalReference,
          checkoutUrl: data.checkoutUrl,
          partnerOrderUrl: data.partnerOrderUrl,
          totalPriceCents: data.totalPriceCents,
          currency: data.currency,
          items: data.items,
          warnings: data.warnings,
          metadata: data.metadata,
          createdAt: new Date("2026-03-23T12:00:00.000Z"),
          updatedAt: new Date("2026-03-23T12:00:00.000Z")
        }),
        findUnique: async () => ({
          id: "order-1",
          documentId: "doc-1",
          provider: "mock-pharmacy",
          providerMode: "mock",
          quoteId: "quote-doc-1",
          status: "CHECKOUT_READY",
          externalReference: "mock-order-quote-doc-1",
          checkoutUrl: "https://pharmacy.receituario.local/quotes/doc-1?partner=eco-farma",
          partnerOrderUrl: "https://pharmacy.receituario.local/partners/eco-farma/orders/doc-1",
          totalPriceCents: 2500,
          currency: "BRL",
          items: [],
          warnings: [],
          metadata: { partnerKey: "eco-farma", routeStrategy: "best-value" },
          createdAt: new Date("2026-03-23T12:00:00.000Z"),
          updatedAt: new Date("2026-03-23T12:00:00.000Z")
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updatedStatus = String(data.status);
          return {
            id: "order-1",
            documentId: "doc-1",
            provider: "mock-pharmacy",
            providerMode: "mock",
            quoteId: "quote-doc-1",
            status: data.status,
            externalReference: "mock-order-quote-doc-1",
            checkoutUrl: "https://pharmacy.receituario.local/quotes/doc-1",
            partnerOrderUrl: "https://pharmacy.receituario.local/partners/mock/orders/doc-1",
            totalPriceCents: 2500,
            currency: "BRL",
            items: [],
            warnings: [],
            metadata: {},
            createdAt: new Date("2026-03-23T12:00:00.000Z"),
            updatedAt: new Date("2026-03-23T12:01:00.000Z")
          };
        }
      }
    } as never,
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
      quotePrescription: async () => ({
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
        sourceReference: "mock:doc-1",
        items: [],
        createdAt: "2026-03-23T12:00:00.000Z"
      }),
      createOrderFromQuote: async ({ documentId }: { documentId: string }) => ({
        id: "order-1",
        documentId,
        provider: "mock-pharmacy",
        providerMode: "mock",
        partnerKey: "eco-farma",
        quoteId: "quote-doc-1",
        routeStrategy: "best-value",
        status: "checkout_ready",
        externalReference: "mock-order-quote-doc-1",
        checkoutUrl: "https://pharmacy.receituario.local/quotes/doc-1?partner=eco-farma",
        partnerOrderUrl: "https://pharmacy.receituario.local/partners/eco-farma/orders/doc-1",
        totalPriceCents: 2500,
        currency: "BRL",
        items: [],
        warnings: [],
        createdAt: "2026-03-23T12:00:00.000Z",
        updatedAt: "2026-03-23T12:00:00.000Z"
      }),
      getOrderStatus: async () => ({
        status: "confirmed",
        externalReference: "mock-order-quote-doc-1",
        partnerOrderUrl: "https://pharmacy.receituario.local/partners/mock/orders/doc-1",
        checkoutUrl: undefined,
        warnings: [],
        metadata: {}
      })
    } as never
  );

  const order = await service.createOrderForPrescription("doc-1");
  const synced = await service.syncOrder("order-1");

  assert.equal(order.status, "checkout_ready");
  assert.equal(order.partnerKey, "eco-farma");
  assert.equal(synced.status, "confirmed");
  assert.equal(updatedStatus, "CONFIRMED");
});

test("sincroniza pedidos pendentes em lote", async () => {
  const service = new PharmacyService(
    {
      pharmacyOrder: {
        findMany: async () => [
          {
            id: "order-1",
            documentId: "doc-1",
            provider: "mock-pharmacy",
            providerMode: "mock",
            quoteId: "quote-doc-1",
            status: "PENDING",
            externalReference: "mock-order-quote-doc-1",
            checkoutUrl: null,
            partnerOrderUrl: null,
            totalPriceCents: 2500,
            currency: "BRL",
            items: [],
            warnings: [],
            metadata: {},
            createdAt: new Date("2026-03-23T12:00:00.000Z"),
            updatedAt: new Date("2026-03-23T12:00:00.000Z")
          }
        ],
        findUnique: async () => ({
          id: "order-1",
          documentId: "doc-1",
          provider: "mock-pharmacy",
          providerMode: "mock",
          quoteId: "quote-doc-1",
          status: "PENDING",
          externalReference: "mock-order-quote-doc-1",
          checkoutUrl: null,
          partnerOrderUrl: null,
          totalPriceCents: 2500,
          currency: "BRL",
          items: [],
          warnings: [],
          metadata: { partnerKey: "eco-farma", routeStrategy: "best-value" },
          createdAt: new Date("2026-03-23T12:00:00.000Z"),
          updatedAt: new Date("2026-03-23T12:00:00.000Z")
        }),
        update: async () => ({
          id: "order-1",
          documentId: "doc-1",
          provider: "mock-pharmacy",
          providerMode: "mock",
          quoteId: "quote-doc-1",
          status: "CONFIRMED",
          externalReference: "mock-order-quote-doc-1",
          checkoutUrl: null,
          partnerOrderUrl: "https://pharmacy.receituario.local/partners/eco-farma/orders/doc-1",
          totalPriceCents: 2500,
          currency: "BRL",
          items: [],
          warnings: [],
          metadata: { partnerKey: "eco-farma", routeStrategy: "best-value" },
          createdAt: new Date("2026-03-23T12:00:00.000Z"),
          updatedAt: new Date("2026-03-23T12:05:00.000Z")
        })
      }
    } as never,
    {} as never,
    {
      getOrderStatus: async () => ({
        status: "confirmed",
        externalReference: "mock-order-quote-doc-1",
        partnerOrderUrl: "https://pharmacy.receituario.local/partners/eco-farma/orders/doc-1",
        checkoutUrl: undefined,
        warnings: [],
        metadata: {}
      })
    } as never
  );

  const result = await service.syncPendingOrders({ limit: 10 });

  assert.equal(result.processed, 1);
  assert.equal(result.results[0]?.status, "confirmed");
});
