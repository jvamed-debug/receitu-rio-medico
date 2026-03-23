import test from "node:test";
import assert from "node:assert/strict";

import { PatientsService } from "./patients.service";

test("cria encounter vinculado ao paciente e profissional da sessao", async () => {
  const service = new PatientsService(
    {
      patientEncounter: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "enc-1",
          patientId: data.patientId,
          organizationId: data.organizationId,
          professionalId: data.professionalId,
          type: data.type,
          title: data.title,
          summary: data.summary,
          notes: data.notes,
          occurredAt: new Date("2026-03-23T10:00:00.000Z"),
          metadata: null,
          createdAt: new Date("2026-03-23T10:00:00.000Z"),
          updatedAt: new Date("2026-03-23T10:00:00.000Z")
        })
      }
    } as never
  );

  const result = await service.createEncounter(
    "patient-1",
    {
      type: "consultation",
      title: "Consulta inicial",
      summary: "Revisao do caso",
      notes: "Paciente com bom estado geral."
    },
    {
      professionalId: "prof-1",
      organizationId: "org-1"
    } as never
  );

  assert.equal(result.patientId, "patient-1");
  assert.equal(result.professionalId, "prof-1");
  assert.equal(result.organizationId, "org-1");
  assert.equal(result.type, "consultation");
});

test("consolida timeline com encounters, documentos e appointments", async () => {
  const service = new PatientsService(
    {
      patientEncounter: {
        findMany: async () => [
          {
            id: "enc-1",
            patientId: "patient-1",
            organizationId: "org-1",
            professionalId: "prof-1",
            type: "CLINICAL_NOTE",
            title: "Nota de evolucao",
            summary: "Paciente estavel",
            notes: null,
            occurredAt: new Date("2026-03-23T15:00:00.000Z"),
            metadata: null,
            createdAt: new Date("2026-03-23T15:00:00.000Z"),
            updatedAt: new Date("2026-03-23T15:00:00.000Z")
          }
        ]
      },
      clinicalDocument: {
        findMany: async () => [
          {
            id: "doc-1",
            patientId: "patient-1",
            type: "PRESCRIPTION",
            status: "ISSUED",
            title: "Prescricao de controle",
            payload: {
              items: [{ medicationName: "Losartana" }]
            },
            layoutVersion: "v1",
            issuedAt: new Date("2026-03-23T14:00:00.000Z"),
            createdAt: new Date("2026-03-23T13:30:00.000Z")
          }
        ]
      },
      appointment: {
        findMany: async () => [
          {
            id: "app-1",
            patientId: "patient-1",
            title: "Retorno ambulatorial",
            telehealth: false,
            status: "COMPLETED",
            appointmentAt: new Date("2026-03-23T12:00:00.000Z"),
            durationMinutes: 30,
            notes: "Sem intercorrencias"
          }
        ]
      }
    } as never
  );

  const result = await service.getTimeline("patient-1");

  assert.equal(result.patientId, "patient-1");
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0]?.sourceType, "encounter");
  assert.equal(result.items[1]?.sourceType, "document");
  assert.equal(result.items[2]?.sourceType, "appointment");
});
