import test from "node:test";
import assert from "node:assert/strict";

import { TelehealthService } from "./telehealth.service";

test("provisiona sala de teleconsulta e retorna url", async () => {
  const service = new TelehealthService(
    {
      appointment: {
        findUnique: async () => ({
          id: "apt-1",
          patientId: "patient-1",
          professionalId: "prof-1",
          organizationId: "org-1",
          title: "Teleconsulta",
          status: "CONFIRMED",
          appointmentAt: new Date("2026-03-25T18:00:00.000Z"),
          durationMinutes: 30,
          notes: null,
          telehealth: true,
          telehealthUrl: null,
          telehealthProvider: null,
          telehealthRoomId: null,
          createdAt: new Date("2026-03-22T18:00:00.000Z"),
          updatedAt: new Date("2026-03-22T18:00:00.000Z"),
          patient: { fullName: "Paciente Teste" },
          billingEntries: []
        }),
        update: async () => ({
          id: "apt-1",
          patientId: "patient-1",
          professionalId: "prof-1",
          organizationId: "org-1",
          title: "Teleconsulta",
          status: "CONFIRMED",
          appointmentAt: new Date("2026-03-25T18:00:00.000Z"),
          durationMinutes: 30,
          notes: null,
          telehealth: true,
          telehealthUrl: "https://telemed.receituario.local/rooms/tele-apt-1",
          telehealthProvider: "bluecare-meet",
          telehealthRoomId: "tele-apt-1",
          createdAt: new Date("2026-03-22T18:00:00.000Z"),
          updatedAt: new Date("2026-03-22T18:01:00.000Z"),
          patient: { fullName: "Paciente Teste" },
          billingEntries: []
        })
      }
    } as never,
    { log: async () => undefined } as never,
    {
      provisionRoom: async () => ({
        provider: "bluecare-meet",
        roomId: "tele-apt-1",
        joinUrl: "https://telemed.receituario.local/rooms/tele-apt-1",
        metadata: {
          providerMode: "mock"
        }
      })
    } as never
  );

  const result = await service.ensureRoom("apt-1", {
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: ["professional"]
  });

  assert.equal(result.telehealth, true);
  assert.equal(result.telehealthRoomId, "tele-apt-1");
  assert.equal(result.telehealthProvider, "bluecare-meet");
});
