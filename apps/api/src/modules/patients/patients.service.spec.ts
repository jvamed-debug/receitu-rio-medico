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

test("cria evolucao clinica estruturada vinculada ao paciente", async () => {
  const service = new PatientsService(
    {
      patientEvolution: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "evo-1",
          patientId: data.patientId,
          organizationId: data.organizationId,
          professionalId: data.professionalId,
          encounterId: data.encounterId,
          title: data.title,
          subjective: data.subjective,
          objective: data.objective,
          assessment: data.assessment,
          plan: data.plan,
          tags: data.tags,
          occurredAt: new Date("2026-03-23T11:00:00.000Z"),
          createdAt: new Date("2026-03-23T11:00:00.000Z"),
          updatedAt: new Date("2026-03-23T11:00:00.000Z")
        })
      }
    } as never
  );

  const result = await service.createEvolution(
    "patient-1",
    {
      title: "Evolucao ambulatorial",
      subjective: "Refere melhora clinica.",
      objective: "PA controlada.",
      assessment: "Boa resposta terapeutica.",
      plan: "Manter seguimento em 30 dias.",
      tags: ["hipertensao", "retorno"]
    },
    {
      professionalId: "prof-1",
      organizationId: "org-1"
    } as never
  );

  assert.equal(result.patientId, "patient-1");
  assert.equal(result.professionalId, "prof-1");
  assert.equal(result.tags?.length, 2);
  assert.equal(result.assessment, "Boa resposta terapeutica.");
});

test("cria problema longitudinal estruturado", async () => {
  const service = new PatientsService(
    {
      patientProblem: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "prob-1",
          patientId: data.patientId,
          organizationId: data.organizationId,
          professionalId: data.professionalId,
          title: data.title,
          status: data.status,
          severity: data.severity,
          notes: data.notes,
          tags: data.tags,
          onsetDate: new Date("2026-03-20T00:00:00.000Z"),
          resolvedAt: null,
          createdAt: new Date("2026-03-23T09:00:00.000Z"),
          updatedAt: new Date("2026-03-23T09:00:00.000Z")
        })
      }
    } as never
  );

  const result = await service.createProblem(
    "patient-1",
    {
      title: "Hipertensao arterial sistemica",
      status: "active",
      severity: "moderada",
      notes: "Segue em monitorizacao ambulatorial.",
      tags: ["cronico", "cardiovascular"]
    },
    {
      professionalId: "prof-1",
      organizationId: "org-1"
    } as never
  );

  assert.equal(result.patientId, "patient-1");
  assert.equal(result.professionalId, "prof-1");
  assert.equal(result.status, "active");
  assert.equal(result.tags?.length, 2);
});

test("cria evento clinico estruturado", async () => {
  const service = new PatientsService(
    {
      patientClinicalEvent: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "evt-1",
          patientId: data.patientId,
          organizationId: data.organizationId,
          professionalId: data.professionalId,
          encounterId: data.encounterId,
          evolutionId: data.evolutionId,
          eventType: data.eventType,
          title: data.title,
          summary: data.summary,
          payload: data.payload,
          occurredAt: new Date("2026-03-23T17:00:00.000Z"),
          createdAt: new Date("2026-03-23T17:00:00.000Z"),
          updatedAt: new Date("2026-03-23T17:00:00.000Z")
        })
      }
    } as never
  );

  const result = await service.createClinicalEvent(
    "patient-1",
    {
      eventType: "lab_result",
      title: "Creatinina elevada",
      summary: "Ajustar seguimento renal.",
      payload: {
        test: "creatinina",
        value: 1.8,
        unit: "mg/dL"
      },
      encounterId: "enc-1"
    },
    {
      professionalId: "prof-1",
      organizationId: "org-1"
    } as never
  );

  assert.equal(result.patientId, "patient-1");
  assert.equal(result.eventType, "lab_result");
  assert.equal(result.encounterId, "enc-1");
});

test("consolida timeline com problemas, eventos, encounters, documentos e appointments", async () => {
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
      patientEvolution: {
        findMany: async () => [
          {
            id: "evo-1",
            patientId: "patient-1",
            organizationId: "org-1",
            professionalId: "prof-1",
            encounterId: "enc-1",
            title: "SOAP de seguimento",
            subjective: "Melhora parcial da dor.",
            objective: "Sem febre, exame sem sinais de gravidade.",
            assessment: "Evolucao favoravel.",
            plan: "Manter observacao e retorno se piora.",
            tags: ["dor", "seguimento"],
            occurredAt: new Date("2026-03-23T16:00:00.000Z"),
            createdAt: new Date("2026-03-23T16:00:00.000Z"),
            updatedAt: new Date("2026-03-23T16:00:00.000Z")
          }
        ]
      },
      patientProblem: {
        findMany: async () => [
          {
            id: "prob-1",
            patientId: "patient-1",
            organizationId: "org-1",
            professionalId: "prof-1",
            title: "Diabetes tipo 2",
            status: "ACTIVE",
            severity: "moderada",
            notes: "Em ajuste terapeutico.",
            tags: ["cronico", "metabolico"],
            onsetDate: new Date("2026-03-23T17:30:00.000Z"),
            resolvedAt: null,
            createdAt: new Date("2026-03-23T17:30:00.000Z"),
            updatedAt: new Date("2026-03-23T17:30:00.000Z")
          }
        ]
      },
      patientClinicalEvent: {
        findMany: async () => [
          {
            id: "evt-1",
            patientId: "patient-1",
            organizationId: "org-1",
            professionalId: "prof-1",
            encounterId: "enc-1",
            evolutionId: null,
            eventType: "LAB_RESULT",
            title: "HbA1c 8,2%",
            summary: "Controle glicemico insuficiente.",
            payload: {
              test: "hba1c",
              value: "8.2%"
            },
            occurredAt: new Date("2026-03-23T18:00:00.000Z"),
            createdAt: new Date("2026-03-23T18:00:00.000Z"),
            updatedAt: new Date("2026-03-23T18:00:00.000Z")
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
  assert.equal(result.items.length, 6);
  assert.equal(result.items[0]?.sourceType, "clinical-event");
  assert.equal(result.items[1]?.sourceType, "problem");
  assert.equal(result.items[2]?.sourceType, "evolution");
  assert.equal(result.items[3]?.sourceType, "encounter");
  assert.equal(result.items[4]?.sourceType, "document");
  assert.equal(result.items[5]?.sourceType, "appointment");
});
