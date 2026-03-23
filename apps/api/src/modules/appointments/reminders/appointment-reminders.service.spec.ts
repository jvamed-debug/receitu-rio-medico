import test from "node:test";
import assert from "node:assert/strict";

import { AppointmentRemindersService } from "./appointment-reminders.service";

test("agenda lembrete por email usando contato do paciente", async () => {
  let createdPayload: Record<string, unknown> | undefined;

  const service = new AppointmentRemindersService(
    {
      appointment: {
        findUnique: async () => ({
          id: "apt-1",
          title: "Retorno clinico",
          status: "CONFIRMED",
          appointmentAt: new Date("2026-03-25T14:00:00.000Z"),
          telehealth: false,
          patient: {
            fullName: "Paciente Teste",
            email: "paciente@teste.app",
            phone: null
          }
        })
      },
      appointmentReminder: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdPayload = data;
          return {
            id: "rem-1",
            appointmentId: "apt-1",
            channel: data.channel,
            status: "PENDING",
            target: data.target,
            scheduledFor: new Date("2026-03-25T13:00:00.000Z"),
            sentAt: null,
            message: data.message,
            createdAt: new Date("2026-03-24T10:00:00.000Z"),
            updatedAt: new Date("2026-03-24T10:00:00.000Z")
          };
        }
      }
    } as never,
    { log: async () => undefined } as never,
    { dispatch: async () => undefined } as never
  );

  const result = await service.scheduleReminder(
    "apt-1",
    {
      channel: "email",
      scheduledFor: "2026-03-25T13:00:00.000Z"
    },
    {
      userId: "user-1",
      professionalId: "prof-1",
      organizationId: "org-1",
      roles: ["professional"]
    }
  );

  assert.equal(result.channel, "email");
  assert.equal(result.target, "paciente@teste.app");
  assert.equal(createdPayload?.target, "paciente@teste.app");
});

test("dispara lembrete e marca como enviado", async () => {
  let updatedPayload: Record<string, unknown> | undefined;

  const service = new AppointmentRemindersService(
    {
      appointmentReminder: {
        findFirst: async () => ({
          id: "rem-1",
          appointmentId: "apt-1",
          channel: "whatsapp",
          target: "+5511999999999",
          scheduledFor: new Date("2026-03-25T13:00:00.000Z"),
          message: "Lembrete",
          metadata: {}
        }),
        update: async ({ data }: { data: Record<string, unknown> }) => {
          updatedPayload = data;
          return {
            id: "rem-1",
            appointmentId: "apt-1",
            channel: "whatsapp",
            status: "SENT",
            target: "+5511999999999",
            scheduledFor: new Date("2026-03-25T13:00:00.000Z"),
            sentAt: new Date("2026-03-25T13:01:00.000Z"),
            message: "Lembrete",
            createdAt: new Date("2026-03-24T10:00:00.000Z"),
            updatedAt: new Date("2026-03-25T13:01:00.000Z")
          };
        }
      }
    } as never,
    { log: async () => undefined } as never,
    {
      dispatch: async () => ({
        providerReference: "provider-rem-1",
        deliveredAt: "2026-03-25T13:01:00.000Z",
        providerMetadata: {
          providerMode: "mock"
        }
      })
    } as never
  );

  const result = await service.dispatchReminder("apt-1", "rem-1", {
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: ["professional"]
  });

  assert.equal(result.status, "sent");
  assert.equal(updatedPayload?.status, "SENT");
});
