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

function createService(
  prismaOverrides?: Partial<{
    clinicalDocument: {
      findUnique?: (...args: any[]) => Promise<any>;
    };
    professionalProfile: {
      findUnique?: (...args: any[]) => Promise<any>;
    };
  }>
) {
  const prisma = {
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-1",
        type: DocumentType.EXAM_REQUEST,
        status: DocumentStatus.READY_FOR_REVIEW,
        authorProfessionalId: "prof-1"
      }),
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
    }
  };

  return new ComplianceService(prisma as never);
}
