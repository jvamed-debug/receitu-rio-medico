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
      listByEntity: async () => [],
      log: async () => ({})
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
      listByEntity: async () => [
        {
          action: "appointment_billing_webhook_received",
          metadata: {
            eventId: "evt-duplicado"
          }
        }
      ],
      log: async () => ({})
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
