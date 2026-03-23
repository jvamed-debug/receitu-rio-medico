import test from "node:test";
import assert from "node:assert/strict";

import {
  DocumentStatus,
  SignatureProvider,
  SignatureSessionStatus
} from "@prisma/client";

import { SignatureService } from "./signature.service";

test("signDocument persiste evidencia e referencia de provider", async () => {
  let createdSessionPayload: Record<string, unknown> | undefined;
  let updatedSessionPayload: Record<string, unknown> | undefined;

  const service = createService(
    {
      signatureSession: {
        create: async ({ data }) => ({
          ...(createdSessionPayload = data),
          id: "sig-1",
          documentId: data.documentId,
          provider: data.provider,
          signatureLevel: data.signatureLevel,
          policyVersion: data.policyVersion,
          status: SignatureSessionStatus.PENDING,
          expiresAt: data.expiresAt ?? null,
          createdAt: new Date("2026-03-22T16:00:00.000Z")
        }),
        update: async ({ data }) => {
          updatedSessionPayload = data;
        },
        findMany: async () => []
      },
      clinicalDocument: {
        update: async () => ({
          id: "doc-1",
          status: DocumentStatus.ISSUED,
          issuedAt: new Date("2026-03-22T16:01:00.000Z")
        })
      },
      pdfArtifact: {
        findUnique: async () => null,
        create: async () => ({
          id: "pdf-1",
          storageKey: "documents/doc-1/final.pdf",
          sha256: "sha256-doc-1"
        })
      }
    },
    {
      validateBeforeSignature: async () => ({
        policy: {
          policyVersion: "2026.03",
          signatureLevel: "qualified",
          retentionCategory: "prescription"
        },
        document: {
          id: "doc-1"
        },
        professional: {
          id: "prof-1",
          status: "ACTIVE",
          councilType: "CRM",
          councilState: "SP",
          documentNumber: "123456",
          rqe: null,
          signatureValidatedAt: new Date("2026-03-22T15:00:00.000Z")
        },
        provider: SignatureProvider.ICP_BRASIL_VENDOR
      }),
      buildSignatureComplianceRecord: () => ({
        policyVersion: "2026.03",
        signatureLevel: "qualified",
        retentionCategory: "prescription",
        evaluatedAt: "2026-03-22T16:00:00.000Z"
      })
    }
  );

  const result = await service.signDocument({
    professionalId: "prof-1",
    documentId: "doc-1",
    requestContext: {
      ip: "127.0.0.1",
      userAgent: "jest-like-agent",
      origin: "web"
    }
  });

  assert.equal(result.sessionId, "sig-1");
  assert.equal(result.status, DocumentStatus.ISSUED);
  assert.equal(updatedSessionPayload?.status, SignatureSessionStatus.SIGNED);
  assert.equal(updatedSessionPayload?.providerReference, "sigref-sig-1");
  assert.equal(
    ((createdSessionPayload?.evidence as Record<string, unknown>) ?? {}).policyVersion,
    "2026.03"
  );
});

function createService(
  prismaOverrides?: Partial<{
    signatureSession: {
      create?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
      findMany?: (...args: any[]) => Promise<any>;
    };
    clinicalDocument: {
      update?: (...args: any[]) => Promise<any>;
    };
    pdfArtifact: {
      findUnique?: (...args: any[]) => Promise<any>;
      create?: (...args: any[]) => Promise<any>;
    };
  }>,
  complianceOverrides?: Partial<{
    validateBeforeSignature: (...args: any[]) => Promise<any>;
    buildSignatureComplianceRecord: (...args: any[]) => Record<string, unknown>;
  }>
) {
  const prisma = {
    signatureSession: {
      create: async () => ({
        id: "sig-1",
        documentId: "doc-1",
        provider: SignatureProvider.ICP_BRASIL_VENDOR,
        signatureLevel: "qualified",
        policyVersion: "2026.03",
        status: SignatureSessionStatus.PENDING,
        expiresAt: null,
        createdAt: new Date("2026-03-22T16:00:00.000Z")
      }),
      update: async () => undefined,
      findMany: async () => [],
      ...prismaOverrides?.signatureSession
    },
    clinicalDocument: {
      update: async () => ({
        id: "doc-1",
        status: DocumentStatus.ISSUED,
        issuedAt: new Date("2026-03-22T16:01:00.000Z")
      }),
      ...prismaOverrides?.clinicalDocument
    },
    pdfArtifact: {
      findUnique: async () => null,
      create: async () => ({
        id: "pdf-1",
        storageKey: "documents/doc-1/final.pdf",
        sha256: "sha256-doc-1"
      }),
      ...prismaOverrides?.pdfArtifact
    }
  };

  const auditService = {
    log: async () => undefined
  };

  const compliance = {
    validateBeforeSignature: async () => ({
      policy: {
        policyVersion: "2026.03",
        signatureLevel: "qualified",
        retentionCategory: "prescription"
      },
      document: {
        id: "doc-1"
      },
      professional: {
        id: "prof-1",
        status: "ACTIVE",
        councilType: "CRM",
        councilState: "SP",
        documentNumber: "123456",
        rqe: null,
        signatureValidatedAt: new Date("2026-03-22T15:00:00.000Z")
      },
      provider: SignatureProvider.ICP_BRASIL_VENDOR
    }),
    buildSignatureComplianceRecord: () => ({
      policyVersion: "2026.03",
      signatureLevel: "qualified",
      retentionCategory: "prescription",
      evaluatedAt: "2026-03-22T16:00:00.000Z"
    }),
    ...complianceOverrides
  };

  return new SignatureService(
    prisma as never,
    auditService as never,
    compliance as never
  );
}
