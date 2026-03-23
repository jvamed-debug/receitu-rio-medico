import test from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";
import { DocumentStatus, DocumentType } from "@prisma/client";

import { DocumentsService } from "./documents.service";

test("bloqueia prescricao com alerta que exige override sem justificativa", async () => {
  const service = new DocumentsService(
    {
      cdsOverrideReview: {
        create: async () => undefined
      },
      clinicalDocument: {
        create: async () => {
          throw new Error("nao deveria persistir");
        }
      }
    } as never,
    {
      validateDraft: () => ({
        status: "ready_for_review"
      })
    } as never,
    {
      analyzePrescription: async () => ({
        severity: "high",
        reviewedAt: new Date().toISOString(),
        alerts: [
          {
            code: "condition_pregnancy_risk",
            severity: "high",
            category: "condition",
            message: "Risco gestacional",
            requiresOverrideJustification: true
          }
        ]
      })
    } as never
  );

  await assert.rejects(
    service.createPrescription({
      patientId: "patient-1",
      authorProfessionalId: "prof-1",
      title: "Prescricao teste",
      items: [{ medicationName: "Isotretinoina", dosage: "1 comp" }]
    } as never),
    BadRequestException
  );
});

test("persiste prescricao com override justificado", async () => {
  let createdReviewPayload: Record<string, unknown> | undefined;

  const service = new DocumentsService(
    {
      cdsOverrideReview: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdReviewPayload = data;
        }
      },
      clinicalDocument: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "doc-1",
          type: DocumentType.PRESCRIPTION,
          status: DocumentStatus.READY_FOR_REVIEW,
          patientId: data.patientId,
          authorProfessionalId: data.authorProfessionalId,
          title: data.title,
          payload: data.payload,
          layoutVersion: "v1",
          payloadHash: "hash",
          issuedAt: null,
          derivedFromDocumentId: null,
          createdAt: new Date("2026-03-23T10:00:00.000Z"),
          updatedAt: new Date("2026-03-23T10:00:00.000Z")
        })
      }
    } as never,
    {
      validateDraft: () => ({
        status: "ready_for_review"
      })
    } as never,
    {
      analyzePrescription: async () => ({
        severity: "high",
        reviewedAt: new Date().toISOString(),
        alerts: [
          {
            code: "condition_pregnancy_risk",
            severity: "high",
            category: "condition",
            message: "Risco gestacional",
            requiresOverrideJustification: true
          }
        ]
      })
    } as never
  );

  const result = await service.createPrescription({
    patientId: "patient-1",
    authorProfessionalId: "prof-1",
    title: "Prescricao teste",
    items: [{ medicationName: "Isotretinoina", dosage: "1 comp" }],
    cdsOverride: {
      justification: "Beneficio clinico supera risco com monitorizacao rigorosa.",
      acceptedAlertCodes: ["condition_pregnancy_risk"]
    }
  } as never);

  assert.equal(result.type, "prescription");
  assert.equal(result.cdsOverride?.acceptedAlertCodes[0], "condition_pregnancy_risk");
  assert.equal(createdReviewPayload?.documentId, "doc-1");
});
