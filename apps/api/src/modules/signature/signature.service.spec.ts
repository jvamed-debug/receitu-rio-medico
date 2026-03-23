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
  assert.equal(updatedSessionPayload?.providerReference, "icpbr-sig-1");
  assert.equal(
    ((createdSessionPayload?.evidence as Record<string, unknown>) ?? {}).policyVersion,
    "2026.03"
  );
});

test("handleProviderCallback finaliza sessao assinada", async () => {
  let updatedSessionPayload: Record<string, unknown> | undefined;

  const service = createService(
    {
      signatureSession: {
        findUnique: async () => ({
          id: "sig-2",
          documentId: "doc-2",
          professionalId: "prof-1",
          provider: SignatureProvider.ICP_BRASIL_VENDOR,
          policyVersion: "2026.03",
          signatureLevel: "qualified",
          providerReference: null,
          evidence: { policyVersion: "2026.03" }
        }),
        update: async ({ data }) => {
          updatedSessionPayload = data;
        },
        findMany: async () => []
      },
      clinicalDocument: {
        update: async () => ({
          id: "doc-2",
          status: DocumentStatus.ISSUED,
          issuedAt: new Date("2026-03-22T17:01:00.000Z")
        })
      },
      pdfArtifact: {
        findUnique: async () => null,
        create: async () => ({
          id: "pdf-2",
          storageKey: "documents/doc-2/final.pdf",
          sha256: "sha256-doc-2"
        })
      }
    }
  );

  const result = await service.handleProviderCallback({
    sessionId: "sig-2",
    status: "signed",
    externalReference: "provider-sig-2",
    signedAt: "2026-03-22T17:01:00.000Z",
    evidence: {
      providerMode: "remote"
    }
  });

  assert.equal(result.sessionId, "sig-2");
  assert.equal(result.status, DocumentStatus.ISSUED);
  assert.equal(updatedSessionPayload?.status, SignatureSessionStatus.SIGNED);
  assert.equal(updatedSessionPayload?.providerReference, "provider-sig-2");
});

function createService(
  prismaOverrides?: Partial<{
    signatureSession: {
      create?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
      findUnique?: (...args: any[]) => Promise<any>;
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
  }>,
  gatewayOverrides?: Partial<{
    sign: (...args: any[]) => Promise<any>;
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
      findUnique: async () => null,
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

  const gateway = {
    sign: async () => ({
      externalReference: "icpbr-sig-1",
      signedAt: "2026-03-22T16:00:30.000Z",
      evidence: {
        providerMode: "mock"
      }
    }),
    ...gatewayOverrides
  };

  return new SignatureService(
    prisma as never,
    auditService as never,
    compliance as never,
    gateway as never
  );
}
