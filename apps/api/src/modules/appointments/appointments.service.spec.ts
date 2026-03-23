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
