import test from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";
import {
  DocumentStatus,
  DocumentType,
  ProfessionalStatus,
  RetentionReviewStatus,
  SignatureProvider
} from "@prisma/client";

import { ComplianceService } from "./compliance.service";

test("bloqueia assinatura qualificada sem provider ICP-Brasil", async () => {
  const service = createService({
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-1",
        type: DocumentType.PRESCRIPTION,
        status: DocumentStatus.READY_FOR_REVIEW,
        authorProfessionalId: "prof-1"
      })
    },
    professionalProfile: {
      findUnique: async () => ({
        id: "prof-1",
        status: ProfessionalStatus.ACTIVE,
        signatureProvider: SignatureProvider.GOVBR_VENDOR,
        documentNumber: "123456",
        councilType: "CRM",
        councilState: "SP",
        rqe: null,
        signatureValidatedAt: new Date("2026-03-22T15:00:00.000Z")
      })
    }
  });

  await assert.rejects(
    service.validateBeforeSignature({
      documentId: "doc-1",
      professionalId: "prof-1"
    }),
    BadRequestException
  );
});

test("bloqueia assinatura com perfil profissional incompleto", async () => {
  const service = createService({
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-1",
        type: DocumentType.EXAM_REQUEST,
        status: DocumentStatus.READY_FOR_REVIEW,
        authorProfessionalId: "prof-1"
      })
    },
    professionalProfile: {
      findUnique: async () => ({
        id: "prof-1",
        status: ProfessionalStatus.ACTIVE,
        signatureProvider: SignatureProvider.GOVBR_VENDOR,
        documentNumber: "",
        councilType: "CRM",
        councilState: "SP",
        rqe: null,
        signatureValidatedAt: new Date("2026-03-22T15:00:00.000Z")
      })
    }
  });

  await assert.rejects(
    service.validateBeforeSignature({
      documentId: "doc-1",
      professionalId: "prof-1"
    }),
    BadRequestException
  );
});

test("gera snapshot regulatorio para trilha probatoria", () => {
  const service = createService();

  const record = service.buildSignatureComplianceRecord({
    policy: service.getPolicy("medical-certificate"),
    provider: SignatureProvider.GOVBR_VENDOR,
    professional: {
      id: "prof-1",
      status: ProfessionalStatus.ACTIVE,
      councilType: "CRM",
      councilState: "SP",
      documentNumber: "123456",
      rqe: "9988",
      signatureValidatedAt: new Date("2026-03-22T15:00:00.000Z")
    }
  });

  assert.equal(record.policyVersion, "2026.03");
  assert.equal(record.signatureLevel, "advanced");
  assert.equal(record.professional.rqe, "9988");
});

test("gera snapshot de retencao com categorias configuradas", async () => {
  const service = createService(undefined, {
    RETENTION_CLINICAL_RECORD_DAYS: "4000",
    RETENTION_MEDICAL_CERTIFICATE_DAYS: "2000",
    RETENTION_PRESCRIPTION_DAYS: "1500",
    RETENTION_ARCHIVE_AFTER_DAYS: "120"
  });

  const snapshot = await service.getRetentionPolicySnapshot();

  assert.equal(snapshot.archiveAfterDays, 120);
  assert.equal(snapshot.categories.clinical_record, 4000);
  assert.equal(
    snapshot.documentTypes.find((item) => item.documentType === "prescription")?.retentionDays,
    1500
  );
});

test("aplica matriz institucional por tipo documental", async () => {
  const service = createService({
    organization: {
      findUnique: async () => ({
        settings: {
          documentPolicyMatrix: {
            "medical-certificate": {
              requireRqe: true,
              minimumShareRole: "admin",
              requirePatientConsentForExternalShare: true,
              shareLinkTtlHours: 6,
              shareLinkMaxUses: 1,
              allowExternalShare: true
            }
          }
        }
      })
    }
  });

  const policy = await service.getPolicyForPrincipal("medical-certificate", {
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: ["professional"]
  });

  assert.equal(policy.requiresRqe, true);
  assert.equal(policy.minimumShareRole, "admin");
  assert.equal(policy.shareLinkTtlHours, 6);
  assert.equal(policy.shareLinkMaxUses, 1);
});

test("bloqueia compartilhamento externo sem consentimento ativo quando politica exige", async () => {
  const service = createService({
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-1",
        type: DocumentType.MEDICAL_CERTIFICATE,
        status: DocumentStatus.SIGNED,
        authorProfessionalId: "prof-1",
        patientId: "patient-1",
        organizationId: "org-1"
      })
    },
    patientConsentRecord: {
      findFirst: async () => null
    }
  });

  await assert.rejects(
    service.validateBeforeExternalShare({
      documentId: "doc-1",
      principal: {
        userId: "user-1",
        professionalId: "prof-1",
        organizationId: "org-1",
        roles: ["professional"]
      }
    }),
    BadRequestException
  );
});

test("gera review de retencao quando descarte exige aprovacao", async () => {
  const createdReviews: Array<{ reviewType: string }> = [];
  const service = createService(
    {
      clinicalDocument: {
        findMany: async () => [
          {
            id: "doc-1",
            type: DocumentType.MEDICAL_CERTIFICATE,
            status: DocumentStatus.ARCHIVED,
            issuedAt: new Date("2020-01-01T00:00:00.000Z"),
            createdAt: new Date("2020-01-01T00:00:00.000Z"),
            organizationId: "org-1"
          }
        ]
      },
      complianceRetentionReview: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => {
          createdReviews.push({ reviewType: String(data.reviewType) });
          return {
            id: "review-1",
            documentId: "doc-1",
            organizationId: "org-1",
            documentType: DocumentType.MEDICAL_CERTIFICATE,
            retentionCategory: "medical_certificate",
            reviewType: data.reviewType,
            status: RetentionReviewStatus.PENDING,
            dueAt: new Date("2026-04-01T00:00:00.000Z"),
            rationale: "review",
            requestedByUserId: "user-1",
            resolvedByUserId: null,
            resolutionNotes: null,
            resolvedAt: null,
            createdAt: new Date("2026-03-25T00:00:00.000Z"),
            updatedAt: new Date("2026-03-25T00:00:00.000Z")
          };
        }
      }
    },
    {
      RETENTION_MEDICAL_CERTIFICATE_DAYS: "30",
      RETENTION_ARCHIVE_AFTER_DAYS: "15"
    }
  );

  const result = await service.runRetentionReviewSweep(
    {
      userId: "user-1",
      professionalId: "prof-1",
      organizationId: "org-1",
      roles: ["compliance"]
    },
    { limit: 5 }
  );

  assert.equal(result.created >= 1, true);
  assert.equal(createdReviews.length >= 1, true);
});

test("gera analytics anonimizados sem ids de paciente", async () => {
  const service = createService(
    {
      clinicalDocument: {
        findMany: async () => [
          {
            type: DocumentType.PRESCRIPTION,
            status: DocumentStatus.ISSUED,
            createdAt: new Date("2026-03-20T10:00:00.000Z")
          },
          {
            type: DocumentType.EXAM_REQUEST,
            status: DocumentStatus.SIGNED,
            createdAt: new Date("2026-03-20T11:00:00.000Z")
          }
        ]
      },
      appointment: {
        findMany: async () => [
          {
            status: "COMPLETED",
            telehealth: true,
            appointmentAt: new Date("2026-03-20T12:00:00.000Z")
          }
        ]
      }
    },
    {}
  );

  const snapshot = await service.getAnonymizedAnalyticsSnapshot({
    userId: "user-1",
    professionalId: "prof-1",
    organizationId: "org-1",
    roles: ["professional"]
  });

  assert.equal(snapshot.documents.total, 2);
  assert.equal(snapshot.documents.byType["prescription"], 1);
  assert.equal(snapshot.appointments.telehealth, 1);
  assert.equal(snapshot.dailyActivity[0]?.documents, 2);
  assert.equal("patientId" in snapshot, false);
});

function createService(
  prismaOverrides?: Partial<{
    clinicalDocument: {
      findUnique?: (...args: any[]) => Promise<any>;
      findMany?: (...args: any[]) => Promise<any>;
    };
    professionalProfile: {
      findUnique?: (...args: any[]) => Promise<any>;
    };
    appointment: {
      findMany?: (...args: any[]) => Promise<any>;
    };
    organization: {
      findUnique?: (...args: any[]) => Promise<any>;
    };
    patientConsentRecord: {
      findMany?: (...args: any[]) => Promise<any>;
      findFirst?: (...args: any[]) => Promise<any>;
      create?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
    };
    complianceRetentionReview: {
      count?: (...args: any[]) => Promise<any>;
      findMany?: (...args: any[]) => Promise<any>;
      findFirst?: (...args: any[]) => Promise<any>;
      create?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
    };
    documentShareToken: {
      findMany?: (...args: any[]) => Promise<any>;
    };
  }>,
  configValues?: Record<string, string>
) {
  const prisma = {
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-1",
        type: DocumentType.EXAM_REQUEST,
        status: DocumentStatus.READY_FOR_REVIEW,
        authorProfessionalId: "prof-1"
      }),
      findMany: async () => [],
      ...prismaOverrides?.clinicalDocument
    },
    professionalProfile: {
      findUnique: async () => ({
        id: "prof-1",
        status: ProfessionalStatus.ACTIVE,
        signatureProvider: SignatureProvider.GOVBR_VENDOR,
        documentNumber: "123456",
        councilType: "CRM",
        councilState: "SP",
        rqe: null,
        signatureValidatedAt: new Date("2026-03-22T15:00:00.000Z")
      }),
      ...prismaOverrides?.professionalProfile
    },
    appointment: {
      findMany: async () => [],
      ...prismaOverrides?.appointment
    },
    organization: {
      findUnique: async () => null,
      ...prismaOverrides?.organization
    },
    patientConsentRecord: {
      findMany: async () => [],
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "consent-1",
        patientId: data.patientId,
        organizationId: data.organizationId ?? null,
        professionalId: data.professionalId,
        consentType: data.consentType,
        status: "GRANTED",
        purpose: data.purpose,
        legalBasis: data.legalBasis,
        grantedAt: new Date("2026-03-25T10:00:00.000Z"),
        expiresAt: data.expiresAt ?? null,
        revokedAt: null,
        metadata: data.metadata ?? null,
        createdAt: new Date("2026-03-25T10:00:00.000Z"),
        updatedAt: new Date("2026-03-25T10:00:00.000Z")
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "consent-1",
        patientId: "patient-1",
        organizationId: "org-1",
        professionalId: "prof-1",
        consentType: "EXTERNAL_DOCUMENT_SHARE",
        status: data.status ?? "REVOKED",
        purpose: "share",
        legalBasis: "consentimento",
        grantedAt: new Date("2026-03-25T10:00:00.000Z"),
        expiresAt: null,
        revokedAt: data.revokedAt ?? new Date("2026-03-25T11:00:00.000Z"),
        metadata: data.metadata ?? null,
        createdAt: new Date("2026-03-25T10:00:00.000Z"),
        updatedAt: new Date("2026-03-25T11:00:00.000Z")
      }),
      ...prismaOverrides?.patientConsentRecord
    },
    complianceRetentionReview: {
      count: async () => 0,
      findMany: async () => [],
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "review-1",
        documentId: data.documentId,
        organizationId: data.organizationId ?? null,
        documentType: data.documentType,
        retentionCategory: data.retentionCategory,
        reviewType: data.reviewType,
        status: RetentionReviewStatus.PENDING,
        dueAt: data.dueAt,
        rationale: data.rationale ?? null,
        requestedByUserId: data.requestedByUserId ?? null,
        resolvedByUserId: null,
        resolutionNotes: null,
        resolvedAt: null,
        createdAt: new Date("2026-03-25T10:00:00.000Z"),
        updatedAt: new Date("2026-03-25T10:00:00.000Z")
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "review-1",
        documentId: "doc-1",
        organizationId: "org-1",
        documentType: DocumentType.MEDICAL_CERTIFICATE,
        retentionCategory: "medical_certificate",
        reviewType: "DISPOSAL",
        status: data.status ?? RetentionReviewStatus.APPROVED,
        dueAt: new Date("2026-04-01T00:00:00.000Z"),
        rationale: "review",
        requestedByUserId: "user-1",
        resolvedByUserId: data.resolvedByUserId ?? "user-1",
        resolutionNotes: data.resolutionNotes ?? null,
        resolvedAt: data.resolvedAt ?? new Date("2026-03-25T11:00:00.000Z"),
        createdAt: new Date("2026-03-25T10:00:00.000Z"),
        updatedAt: new Date("2026-03-25T11:00:00.000Z")
      }),
      ...prismaOverrides?.complianceRetentionReview
    },
    documentShareToken: {
      findMany: async () => [],
      ...prismaOverrides?.documentShareToken
    }
  };

  return new ComplianceService(
    prisma as never,
    {
      get: (key: string) => configValues?.[key]
    } as never
  );
}
