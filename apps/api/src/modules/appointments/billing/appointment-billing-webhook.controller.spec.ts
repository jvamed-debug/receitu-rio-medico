import test from "node:test";
import assert from "node:assert/strict";

import { AppointmentBillingWebhookController } from "./appointment-billing-webhook.controller";

test("webhook reconcilia cobranca quando segredo e valido", async () => {
  let reconciledWith:
    | {
        appointmentId: string;
        billingId: string;
        input: { status: "authorized" | "paid" | "cancelled" | "refunded" };
      }
    | undefined;

  const controller = new AppointmentBillingWebhookController(
    {
      reconcileEntry: async (
        appointmentId: string,
        billingId: string,
        input: { status: "authorized" | "paid" | "cancelled" | "refunded" }
      ) => {
        reconciledWith = { appointmentId, billingId, input };
        return { id: billingId, status: input.status };
      },
      listByAppointment: async () => []
    } as never,
    {
      get: () => "webhook-secret"
    } as never,
    {
      log: async () => ({})
    } as never,
    {
      appointmentBillingWebhookEvent: {
        findUnique: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "event-1",
          ...data
        }),
        update: async () => ({})
      }
    } as never
  );

  const result = await controller.receiveProviderEvent("webhook-secret", {
    eventId: "evt-1",
    appointmentId: "apt-1",
    billingId: "bill-1",
    status: "paid"
  });

  assert.deepEqual(reconciledWith, {
    appointmentId: "apt-1",
    billingId: "bill-1",
    input: { status: "paid" }
  });
  assert.deepEqual(result, { id: "bill-1", status: "paid" });
});

test("webhook ignora evento duplicado quando eventId ja foi processado", async () => {
  let reconcileCalled = false;

  const controller = new AppointmentBillingWebhookController(
    {
      reconcileEntry: async () => {
        reconcileCalled = true;
        return { id: "bill-1", status: "paid" };
      },
      listByAppointment: async () => [{ id: "bill-1", status: "paid" }]
    } as never,
    {
      get: () => "webhook-secret"
    } as never,
    {
      log: async () => ({})
    } as never,
    {
      appointmentBillingWebhookEvent: {
        findUnique: async () => ({
          id: "event-duplicado",
          processedAt: new Date("2026-03-23T10:00:00.000Z")
        })
      }
    } as never
  );

  const result = await controller.receiveProviderEvent("webhook-secret", {
    eventId: "evt-duplicado",
    appointmentId: "apt-1",
    billingId: "bill-1",
    status: "paid"
  });

  assert.equal(reconcileCalled, false);
  assert.deepEqual(result, { id: "bill-1", status: "paid" });
});
