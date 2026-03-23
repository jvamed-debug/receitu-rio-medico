import test from "node:test";
import assert from "node:assert/strict";

import { AppointmentBillingService } from "./appointment-billing.service";

test("cria cobranca inicial para consulta", async () => {
  const service = new AppointmentBillingService(
    {
      appointmentBilling: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "bill-1",
          appointmentId: data.appointmentId,
          status: "PENDING",
          amountCents: data.amountCents,
          currency: "BRL",
          description: data.description,
          paymentProvider: data.paymentProvider,
          externalReference: null,
          authorizedAt: null,
          paidAt: null,
          createdAt: new Date("2026-03-22T18:00:00.000Z"),
          updatedAt: new Date("2026-03-22T18:00:00.000Z")
        })
      }
    } as never,
    { log: async () => undefined } as never
  );

  const result = await service.createEntry(
    "apt-1",
    {
      amountCents: 18000,
      description: "Consulta particular"
    },
    {
      userId: "user-1",
      professionalId: "prof-1",
      organizationId: "org-1",
      roles: ["professional"]
    }
  );

  assert.equal(result.status, "pending");
  assert.equal(result.amountCents, 18000);
});

test("marca cobranca como paga e gera referencia externa", async () => {
  const service = new AppointmentBillingService(
    {
      appointmentBilling: {
        findFirst: async () => ({
          id: "bill-1",
          appointmentId: "apt-1",
          status: "AUTHORIZED",
          paymentProvider: "manual",
          externalReference: null,
          authorizedAt: new Date("2026-03-22T18:00:00.000Z"),
          paidAt: null
        }),
        update: async () => ({
          id: "bill-1",
          appointmentId: "apt-1",
          status: "PAID",
          amountCents: 18000,
          currency: "BRL",
          description: "Consulta particular",
          paymentProvider: "manual",
          externalReference: "manual-bill-1",
          authorizedAt: new Date("2026-03-22T18:00:00.000Z"),
          paidAt: new Date("2026-03-22T18:15:00.000Z"),
          createdAt: new Date("2026-03-22T17:00:00.000Z"),
          updatedAt: new Date("2026-03-22T18:15:00.000Z")
        })
      }
    } as never,
    { log: async () => undefined } as never
  );

  const result = await service.payEntry(
    "apt-1",
    "bill-1",
    {
      userId: "user-1",
      professionalId: "prof-1",
      organizationId: "org-1",
      roles: ["professional"]
    }
  );

  assert.equal(result.status, "paid");
  assert.equal(result.externalReference, "manual-bill-1");
});
