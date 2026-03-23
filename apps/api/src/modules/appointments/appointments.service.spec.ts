import test from "node:test";
import assert from "node:assert/strict";

import { UserRole } from "@prisma/client";

import { AppointmentsService } from "./appointments.service";

test("lista agenda do profissional no escopo da organizacao", async () => {
  let receivedWhere: Record<string, unknown> | undefined;
  const service = new AppointmentsService({
    appointment: {
      findMany: async ({ where }: { where: Record<string, unknown> | undefined }) => {
        receivedWhere = where;
        return [];
      }
    }
  } as never);

  await service.list({
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: [UserRole.PROFESSIONAL.toLowerCase()]
  });

  assert.deepEqual(receivedWhere, {
    organizationId: "org-1",
    professionalId: "prof-1"
  });
});

test("mapeia status de agenda ao retornar consulta", async () => {
  const service = new AppointmentsService({
    appointment: {
      findMany: async () => [
        {
          id: "apt-1",
          patientId: "patient-1",
          professionalId: "prof-1",
          organizationId: "org-1",
          title: "Retorno clinico",
          status: "CONFIRMED",
          appointmentAt: new Date("2026-03-22T12:00:00.000Z"),
          durationMinutes: 30,
          notes: null,
          telehealth: false,
          telehealthUrl: null,
          telehealthProvider: null,
          telehealthRoomId: null,
          billingEntries: [],
          createdAt: new Date("2026-03-22T10:00:00.000Z"),
          updatedAt: new Date("2026-03-22T10:00:00.000Z"),
          patient: {
            fullName: "Paciente Teste"
          }
        }
      ]
    }
  } as never);

  const result = await service.list({
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: [UserRole.PROFESSIONAL.toLowerCase()]
  });

  assert.equal(result[0]?.status, "confirmed");
  assert.equal(result[0]?.patientName, "Paciente Teste");
  assert.deepEqual(result[0]?.billingEntries, []);
});

test("resume agenda com cobrancas e lembretes", async () => {
  const service = new AppointmentsService({
    appointment: {
      findMany: async () => [
        {
          id: "apt-1",
          status: "SCHEDULED",
          telehealth: true,
          reminders: [{ id: "rem-1", status: "PENDING" }],
          billingEntries: [
            { id: "bill-1", status: "PENDING", amountCents: 10000 },
            { id: "bill-2", status: "PAID", amountCents: 12000 }
          ]
        },
        {
          id: "apt-2",
          status: "CONFIRMED",
          telehealth: false,
          reminders: [],
          billingEntries: [{ id: "bill-3", status: "AUTHORIZED", amountCents: 8000 }]
        }
      ]
    }
  } as never);

  const result = await service.summary({
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: [UserRole.PROFESSIONAL.toLowerCase()]
  });

  assert.equal(result.total, 2);
  assert.equal(result.telehealth, 1);
  assert.equal(result.remindersPending, 1);
  assert.equal(result.billingPendingCents, 10000);
  assert.equal(result.billingAuthorizedCents, 8000);
  assert.equal(result.billingPaidCents, 12000);
});

test("gera snapshot operacional com falhas de lembrete e eventos de webhook", async () => {
  const service = new AppointmentsService({
    appointment: {
      findMany: async () => [{ id: "apt-1" }, { id: "apt-2" }]
    },
    appointmentReminder: {
      count: async ({
        where
      }: {
        where: { status: string; nextAttemptAt?: { not: null }; appointmentId: { in: string[] } };
      }) => (where.nextAttemptAt ? 1 : 2)
    },
    appointmentBillingWebhookEvent: {
      findMany: async () => [
        {
          id: "evt-1",
          appointmentId: "apt-1",
          billingId: "bill-1",
          eventId: "provider-1",
          providerReference: "pay-1",
          status: "PAID",
          resultStatus: "paid",
          processedAt: new Date("2026-03-23T12:00:00.000Z"),
          createdAt: new Date("2026-03-23T11:00:00.000Z")
        },
        {
          id: "evt-2",
          appointmentId: "apt-2",
          billingId: "bill-2",
          eventId: null,
          providerReference: null,
          status: "AUTHORIZED",
          resultStatus: "failed",
          processedAt: null,
          createdAt: new Date("2026-03-23T12:30:00.000Z")
        }
      ]
    }
  } as never);

  const result = await service.operations({
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: [UserRole.PROFESSIONAL.toLowerCase()]
  });

  assert.equal(result.failedReminders, 2);
  assert.equal(result.remindersAwaitingRetry, 1);
  assert.equal(result.webhookFailures, 1);
  assert.equal(result.pendingWebhookProcessing, 1);
  assert.equal(result.highestSeverity, "medium");
  assert.equal(result.alerts.length, 4);
  assert.equal(result.recentWebhookEvents.length, 2);
});

test("gera analytics por periodo e profissional", async () => {
  const service = new AppointmentsService({
    appointment: {
      findMany: async () => [
        {
          id: "apt-1",
          professionalId: "prof-1",
          status: "COMPLETED",
          telehealth: true,
          appointmentAt: new Date("2026-03-20T10:00:00.000Z"),
          billingEntries: [{ status: "PAID", amountCents: 10000 }],
          professional: { user: { fullName: "Dra. Ana" } }
        },
        {
          id: "apt-2",
          professionalId: "prof-1",
          status: "NO_SHOW",
          telehealth: false,
          appointmentAt: new Date("2026-03-20T14:00:00.000Z"),
          billingEntries: [{ status: "PENDING", amountCents: 5000 }],
          professional: { user: { fullName: "Dra. Ana" } }
        },
        {
          id: "apt-3",
          professionalId: "prof-2",
          status: "CONFIRMED",
          telehealth: false,
          appointmentAt: new Date("2026-03-21T09:00:00.000Z"),
          billingEntries: [],
          professional: { user: { fullName: "Dr. Bruno" } }
        }
      ]
    }
  } as never);

  const result = await service.analytics(
    {
      userId: "admin-1",
      roles: [UserRole.ADMIN.toLowerCase()]
    },
    {
      dateFrom: "2026-03-20T00:00:00.000Z",
      dateTo: "2026-03-21T23:59:59.000Z"
    }
  );

  assert.equal(result.total, 3);
  assert.equal(result.completed, 1);
  assert.equal(result.noShow, 1);
  assert.equal(result.billingPendingCents, 5000);
  assert.equal(result.billingPaidCents, 10000);
  assert.equal(result.periods.length, 2);
  assert.equal(result.professionals[0]?.professionalName, "Dra. Ana");
  assert.equal(result.professionals[0]?.paidCents, 10000);
  assert.equal(result.funnel.scheduledToConfirmedRate, 33.3);
  assert.equal(result.funnel.confirmedToCompletedRate, 100);
  assert.equal(result.funnel.completedToPaidRate, 100);
});
