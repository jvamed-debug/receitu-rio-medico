import test from "node:test";
import assert from "node:assert/strict";

import { UserRole } from "@prisma/client";

import { AppointmentMaintenanceService } from "./appointment-maintenance.service";

test("executa retries de lembretes e reprocessa webhooks pendentes", async () => {
  const retried: string[] = [];
  const reconciled: string[] = [];
  const updatedWebhookEvents: Array<{ id: string; data: Record<string, unknown> }> = [];
  const auditEvents: string[] = [];

  const service = new AppointmentMaintenanceService(
    {
      appointment: {
        findMany: async () => [{ id: "apt-1" }]
      },
      appointmentReminder: {
        findMany: async () => [
          {
            id: "rem-1",
            appointmentId: "apt-1",
            status: "FAILED",
            nextAttemptAt: new Date("2026-03-23T08:00:00.000Z")
          }
        ]
      },
      appointmentBillingWebhookEvent: {
        findMany: async () => [
          {
            id: "evt-1",
            appointmentId: "apt-1",
            payload: {
              appointmentId: "apt-1",
              billingId: "bill-1",
              status: "paid"
            }
          }
        ],
        update: async ({
          where,
          data
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          updatedWebhookEvents.push({ id: where.id, data });
          return {};
        }
      }
    } as never,
    {
      retryReminder: async (appointmentId: string, reminderId: string) => {
        retried.push(`${appointmentId}:${reminderId}`);
        return { status: "sent" };
      }
    } as never,
    {
      reconcileEntry: async (_appointmentId: string, billingId: string) => {
        reconciled.push(billingId);
        return { status: "paid" };
      }
    } as never,
    {
      log: async ({ action }: { action: string }) => {
        auditEvents.push(action);
      }
    } as never
  );

  const result = await service.run({
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: [UserRole.PROFESSIONAL.toLowerCase()]
  });

  assert.deepEqual(retried, ["apt-1:rem-1"]);
  assert.deepEqual(reconciled, ["bill-1"]);
  assert.equal(result.remindersRetried, 1);
  assert.equal(result.webhooksReprocessed, 1);
  assert.equal(updatedWebhookEvents.length, 1);
  assert.deepEqual(auditEvents, ["appointment_maintenance_run"]);
});
