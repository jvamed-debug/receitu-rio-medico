import test from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";
import {
  DocumentStatus,
  DocumentType,
  ProfessionalStatus,
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

test("gera snapshot de retencao com categorias configuradas", () => {
  const service = createService(undefined, {
    RETENTION_CLINICAL_RECORD_DAYS: "4000",
    RETENTION_MEDICAL_CERTIFICATE_DAYS: "2000",
    RETENTION_PRESCRIPTION_DAYS: "1500",
    RETENTION_ARCHIVE_AFTER_DAYS: "120"
  });

  const snapshot = service.getRetentionPolicySnapshot();

  assert.equal(snapshot.archiveAfterDays, 120);
  assert.equal(snapshot.categories.clinical_record, 4000);
  assert.equal(
    snapshot.documentTypes.find((item) => item.documentType === "prescription")?.retentionDays,
    1500
  );
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
