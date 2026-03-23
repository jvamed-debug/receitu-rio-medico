import test from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";
import { DocumentStatus, DocumentType } from "@prisma/client";

import { DocumentsService } from "./documents.service";

test("bloqueia prescricao com alerta que exige override sem justificativa", async () => {
  const service = new DocumentsService(
    {
      organization: {
        findUnique: async () => null
      },
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
      organization: {
        findUnique: async () => null
      },
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
      acceptedAlertCodes: ["all-required"]
    }
  } as never);

  assert.equal(result.type, "prescription");
  assert.equal(result.cdsOverride?.acceptedAlertCodes[0], "all-required");
  assert.equal(createdReviewPayload?.documentId, "doc-1");
});

test("reconhece override institucional quando autor tem papel privilegiado", async () => {
  let createdReviewPayload: Record<string, unknown> | undefined;

  const service = new DocumentsService(
    {
      organization: {
        findUnique: async () => null
      },
      cdsOverrideReview: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdReviewPayload = data;
        }
      },
      clinicalDocument: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "doc-2",
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
          createdAt: new Date("2026-03-23T11:00:00.000Z"),
          updatedAt: new Date("2026-03-23T11:00:00.000Z")
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
        sources: ["local-rules:v1", "institutional-governance:v1"],
        alerts: [
          {
            code: "interaction_warfarin_nsaid",
            severity: "high",
            category: "interaction",
            message: "Interacao grave",
            requiresOverrideJustification: true,
            source: "institutional_policy",
            institutionalReviewRequired: true,
            minimumReviewerRole: "compliance"
          }
        ]
      })
    } as never
  );

  await service.createPrescription({
    patientId: "patient-1",
    authorProfessionalId: "prof-compliance",
    title: "Prescricao critica",
    items: [{ medicationName: "Warfarina", dosage: "5mg" }],
    requesterRoles: ["compliance"],
    cdsOverride: {
      justification: "Caso revisado por compliance clinico institucional.",
      acceptedAlertCodes: ["all-required"]
    }
  } as never);

  assert.equal(createdReviewPayload?.status, "ACKNOWLEDGED");
  assert.equal(createdReviewPayload?.reviewedByProfessionalId, "prof-compliance");
});

test("mantem review pendente quando politica institucional desabilita auto-reconhecimento", async () => {
  let createdReviewPayload: Record<string, unknown> | undefined;

  const service = new DocumentsService(
    {
      organization: {
        findUnique: async () => ({
          settings: {
            overridePolicy: {
              autoAcknowledgePrivilegedOverride: false
            }
          }
        })
      },
      cdsOverrideReview: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdReviewPayload = data;
        }
      },
      clinicalDocument: {
        create: async ({ data }: { data: Record<string, unknown> }) => ({
          id: "doc-3",
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
          createdAt: new Date("2026-03-23T11:30:00.000Z"),
          updatedAt: new Date("2026-03-23T11:30:00.000Z")
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
        sources: ["local-rules:v1", "institutional-governance:v1"],
        alerts: [
          {
            code: "interaction_warfarin_nsaid",
            severity: "high",
            category: "interaction",
            message: "Interacao grave",
            requiresOverrideJustification: true,
            source: "institutional_policy",
            institutionalReviewRequired: true,
            minimumReviewerRole: "compliance"
          }
        ]
      })
    } as never
  );

  await service.createPrescription({
    patientId: "patient-1",
    organizationId: "org-1",
    authorProfessionalId: "prof-compliance",
    title: "Prescricao critica",
    items: [{ medicationName: "Warfarina", dosage: "5mg" }],
    requesterRoles: ["compliance"],
    cdsOverride: {
      justification: "Caso revisado pelo autor, mas politica exige decisao separada.",
      acceptedAlertCodes: ["all-required"]
    }
  } as never);

  assert.equal(createdReviewPayload?.status, "PENDING");
  assert.equal(createdReviewPayload?.reviewedByProfessionalId, null);
});

test("persiste contrato especifico de solicitacao de exames", async () => {
  let persistedPayload: Record<string, unknown> | undefined;

  const service = new DocumentsService(
    {
      clinicalDocument: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          persistedPayload = data.payload as Record<string, unknown>;

          return {
          id: "doc-exam-1",
          type: DocumentType.EXAM_REQUEST,
          status: DocumentStatus.READY_FOR_REVIEW,
          patientId: data.patientId,
          authorProfessionalId: data.authorProfessionalId,
          title: data.title,
          payload: data.payload,
          layoutVersion: "v1",
          payloadHash: "hash",
          issuedAt: null,
          derivedFromDocumentId: null,
          createdAt: new Date("2026-03-23T12:00:00.000Z"),
          updatedAt: new Date("2026-03-23T12:00:00.000Z")
          };
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
        severity: "none",
        reviewedAt: new Date().toISOString(),
        alerts: []
      })
    } as never
  );

  const result = await service.createExamRequest({
    patientId: "patient-1",
    authorProfessionalId: "prof-1",
    title: "Exames de seguimento",
    requestedExams: ["Hemograma completo", "PCR"],
    indication: "Seguimento de sindrome inflamatoria.",
    priority: "urgent",
    preparationNotes: "Jejum de 8 horas."
  } as never);

  assert.equal(result.type, "exam-request");
  assert.equal(result.indication, "Seguimento de sindrome inflamatoria.");
  assert.equal(result.priority, "urgent");
  assert.equal(
    (persistedPayload?._meta as { payloadVersion?: string } | undefined)?.payloadVersion,
    "exam-request.payload.v2"
  );
  assert.equal(
    (persistedPayload?._meta as { layoutVersion?: string } | undefined)?.layoutVersion,
    "exam-request.layout.v2"
  );
  assert.equal(
    ((persistedPayload?._content as { requestedExams?: string[] } | undefined)?.requestedExams ?? [])
      .length,
    2
  );
});

test("persiste contrato especifico de atestado e documento livre", async () => {
  const payloads: Record<string, unknown>[] = [];

  const service = new DocumentsService(
    {
      clinicalDocument: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          payloads.push(data.payload as Record<string, unknown>);

          return {
            id: `doc-${payloads.length}`,
            type:
              payloads.length === 1
                ? DocumentType.MEDICAL_CERTIFICATE
                : DocumentType.FREE_DOCUMENT,
            status: DocumentStatus.READY_FOR_REVIEW,
            patientId: data.patientId,
            authorProfessionalId: data.authorProfessionalId,
            title: data.title,
            payload: data.payload,
            layoutVersion: "v1",
            payloadHash: "hash",
            issuedAt: null,
            derivedFromDocumentId: null,
            createdAt: new Date("2026-03-23T13:00:00.000Z"),
            updatedAt: new Date("2026-03-23T13:00:00.000Z")
          };
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
        severity: "none",
        reviewedAt: new Date().toISOString(),
        alerts: []
      })
    } as never
  );

  const certificate = await service.createMedicalCertificate({
    patientId: "patient-1",
    authorProfessionalId: "prof-1",
    title: "Atestado medico",
    purpose: "Afastamento temporario",
    restDays: 3,
    certificateKind: "rest",
    workRestrictionNotes: "Evitar esforco fisico.",
    fitToReturnDate: "2026-03-26T00:00:00.000Z"
  } as never);

  const freeDocument = await service.createFreeDocument({
    patientId: "patient-1",
    authorProfessionalId: "prof-1",
    title: "Encaminhamento",
    body: "Encaminho para avaliacao especializada.",
    documentKind: "referral",
    audience: "specialist",
    closingStatement: "Solicito parecer e devolutiva."
  } as never);

  assert.equal(certificate.type, "medical-certificate");
  assert.equal(certificate.certificateKind, "rest");
  assert.equal(certificate.workRestrictionNotes, "Evitar esforco fisico.");
  assert.equal(freeDocument.type, "free-document");
  assert.equal(freeDocument.documentKind, "referral");
  assert.equal(freeDocument.audience, "specialist");
  assert.equal(freeDocument.closingStatement, "Solicito parecer e devolutiva.");
});

test("consolida analytics documentais por tipo e status", async () => {
  const service = new DocumentsService(
    {
      clinicalDocument: {
        findMany: async () => [
                {
                    id: "doc-1",
                    organizationId: "org-1",
                    type: DocumentType.PRESCRIPTION,
                    status: DocumentStatus.DELIVERED,
                    createdAt: new Date("2026-03-20T10:00:00.000Z"),
                    issuedAt: new Date("2026-03-20T11:00:00.000Z"),
                    organization: {
                      id: "org-1",
                      name: "Clinica Azul"
                    }
                },
                {
                    id: "doc-2",
                    organizationId: "org-1",
                    type: DocumentType.EXAM_REQUEST,
                    status: DocumentStatus.ISSUED,
                    createdAt: new Date("2026-03-20T12:00:00.000Z"),
                    issuedAt: new Date("2026-03-20T13:00:00.000Z"),
                    organization: {
                      id: "org-1",
                      name: "Clinica Azul"
                    }
                },
                {
                    id: "doc-3",
                    organizationId: "org-2",
                    type: DocumentType.FREE_DOCUMENT,
                    status: DocumentStatus.DRAFT,
                    createdAt: new Date("2026-03-21T09:00:00.000Z"),
                    issuedAt: null,
                    organization: {
                      id: "org-2",
                      name: "Clinica Verde"
                    }
                }
            ]
        }
    } as never,
    {} as never,
    {} as never
  );

  const analytics = await service.analytics({
    organizationId: "org-1",
    dateFrom: "2026-03-20T00:00:00.000Z",
    dateTo: "2026-03-21T23:59:59.000Z"
  });

  assert.equal(analytics.total, 3);
  assert.equal(analytics.issued, 2);
  assert.equal(analytics.delivered, 1);
  assert.equal(analytics.funnel.createdToSignedRate, 66.7);
  assert.equal(analytics.funnel.signedToIssuedRate, 100);
  assert.equal(analytics.funnel.issuedToDeliveredRate, 50);
  assert.equal(analytics.byType.length, 3);
  assert.equal(analytics.byStatus[0]?.total, 1);
  assert.equal(analytics.recentDays.length, 2);
  assert.equal(analytics.organizations[0]?.organizationName, "Clinica Azul");
  assert.equal(analytics.organizations[0]?.issued, 2);
  assert.equal(analytics.cohorts[0]?.cohort, "2026-03");
  assert.equal(analytics.cohorts[0]?.delivered, 1);
});

test("gera preview com versoes documentais e conteudo tipado", async () => {
  const service = new DocumentsService(
    {
      clinicalDocument: {
        findUnique: async () => ({
          id: "doc-preview-1",
          title: "Prescricao com metadata",
          type: DocumentType.PRESCRIPTION,
          status: DocumentStatus.ISSUED,
          patientId: "patient-1",
          authorProfessionalId: "prof-1",
          layoutVersion: "prescription.layout.v2",
          payloadHash: "hash-preview",
          issuedAt: new Date("2026-03-23T14:00:00.000Z"),
          derivedFromDocumentId: null,
          createdAt: new Date("2026-03-23T13:55:00.000Z"),
          updatedAt: new Date("2026-03-23T14:00:00.000Z"),
          payload: {
            _meta: {
              schemaVersion: "2026.03",
              contractVersion: "document-contract.2026-03",
              payloadVersion: "prescription.payload.v2",
              layoutVersion: "prescription.layout.v2"
            },
            _content: {
              treatmentIntent: "continuous",
              items: [
                {
                  medicationName: "Metformina",
                  dosage: "500mg",
                  frequency: "12/12h"
                }
              ]
            }
          },
          pdfArtifact: null
        })
      }
    } as never,
    {} as never,
    {} as never
  );

  const preview = await service.getPdfPreview("doc-preview-1");

  assert.equal(preview.layoutVersion, "prescription.layout.v2");
  assert.equal(preview.payloadVersion, "prescription.payload.v2");
  assert.equal(preview.schemaVersion, "2026.03");
  assert.equal(preview.contractVersion, "document-contract.2026-03");
  assert.equal(preview.sections[1]?.lines[0], "Metformina | 500mg | frequencia: 12/12h");
});
