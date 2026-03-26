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
  const updatedSessionPayloads: Record<string, unknown>[] = [];

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
          updatedSessionPayloads.push(data);
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
  assert.equal(updatedSessionPayloads[0]?.status, SignatureSessionStatus.SIGNED);
  assert.equal(updatedSessionPayloads[0]?.providerReference, "icpbr-sig-1");
  assert.equal(
    Boolean(
      ((updatedSessionPayloads[1]?.evidence as Record<string, unknown>)?.evidenceBundle as Record<
        string,
        unknown
      >)?.evidenceChainHash
    ),
    true
  );
  assert.equal(
    ((createdSessionPayload?.evidence as Record<string, unknown>) ?? {}).policyVersion,
    "2026.03"
  );
});

test("handleProviderCallback finaliza sessao assinada", async () => {
  const updatedSessionPayloads: Record<string, unknown>[] = [];

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
          updatedSessionPayloads.push(data);
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
  assert.equal(updatedSessionPayloads[0]?.status, SignatureSessionStatus.SIGNED);
  assert.equal(updatedSessionPayloads[0]?.providerReference, "provider-sig-2");
});

function createService(
  prismaOverrides?: Partial<{
    signatureSession: {
      create?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
      findUnique?: (...args: any[]) => Promise<any>;
      findMany?: (...args: any[]) => Promise<any>;
      count?: (...args: any[]) => Promise<any>;
    };
    clinicalDocument: {
      findUnique?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
    };
    auditLog: {
      findMany?: (...args: any[]) => Promise<any>;
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
    getStatus: (...args: any[]) => Promise<any>;
    getReadiness: (...args: any[]) => Promise<any>;
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
      count: async () => 0,
      ...prismaOverrides?.signatureSession
    },
    clinicalDocument: {
      findUnique: async () => null,
      update: async () => ({
        id: "doc-1",
        status: DocumentStatus.ISSUED,
        issuedAt: new Date("2026-03-22T16:01:00.000Z")
      }),
      ...prismaOverrides?.clinicalDocument
    },
    auditLog: {
      findMany: async () => [],
      ...prismaOverrides?.auditLog
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
    getStatus: async () => ({
      status: "pending",
      externalReference: "icpbr-sig-1",
      providerStatus: "pending",
      evidence: {
        providerMode: "mock"
      }
    }),
    getReadiness: async () => ({
      mode: "mock",
      provider: SignatureProvider.ICP_BRASIL_VENDOR,
      checkedAt: "2026-03-23T12:00:00.000Z",
      configured: true,
      callbackVerificationMode: "shared-secret",
      capabilities: {
        createSignature: true,
        statusLookup: true,
        callbackSupport: true,
        hmacVerification: false
      },
      connectivity: {
        status: "mock"
      },
      issues: [],
      metadata: {}
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

test("syncSessionStatus finaliza sessao quando provider remoto retorna signed", async () => {
  let updatedDocument = false;

  const service = createService(
    {
      signatureSession: {
        findUnique: async () => ({
          id: "sig-3",
          documentId: "doc-3",
          professionalId: "prof-1",
          provider: SignatureProvider.ICP_BRASIL_VENDOR,
          policyVersion: "2026.03",
          signatureLevel: "qualified",
          providerReference: "remote-sig-3",
          evidence: { policyVersion: "2026.03" },
          status: SignatureSessionStatus.PENDING,
          signedAt: null
        }),
        update: async () => undefined
      },
      clinicalDocument: {
        update: async () => {
          updatedDocument = true;
          return {
            id: "doc-3",
            status: DocumentStatus.ISSUED,
            issuedAt: new Date("2026-03-22T18:00:00.000Z")
          };
        }
      }
    },
    undefined,
    {
      getStatus: async () => ({
        status: "signed",
        externalReference: "remote-sig-3",
        signedAt: "2026-03-22T18:00:00.000Z",
        providerStatus: "completed",
        evidence: { providerMode: "remote" }
      })
    }
  );

  const result = await service.syncSessionStatus({ sessionId: "sig-3" });

  assert.equal(result.sessionId, "sig-3");
  assert.equal(result.status, DocumentStatus.ISSUED);
  assert.equal(updatedDocument, true);
});

test("syncPendingSessions processa sessoes pendentes com limite", async () => {
  const service = createService(
    {
      signatureSession: {
        findMany: async () => [
          {
            id: "sig-pending-1",
            documentId: "doc-1",
            professionalId: "prof-1",
            provider: SignatureProvider.ICP_BRASIL_VENDOR,
            policyVersion: "2026.03",
            signatureLevel: "qualified",
            providerReference: "remote-sig-1",
            evidence: {},
            status: SignatureSessionStatus.PENDING,
            signedAt: null
          }
        ],
        findUnique: async () => ({
          id: "sig-pending-1",
          documentId: "doc-1",
          professionalId: "prof-1",
          provider: SignatureProvider.ICP_BRASIL_VENDOR,
          policyVersion: "2026.03",
          signatureLevel: "qualified",
          providerReference: "remote-sig-1",
          evidence: {},
          status: SignatureSessionStatus.PENDING,
          signedAt: null
        })
      }
    },
    undefined,
    {
      getStatus: async () => ({
        status: "pending",
        externalReference: "remote-sig-1",
        providerStatus: "processing",
        evidence: { providerMode: "remote" }
      })
    }
  );

  const result = await service.syncPendingSessions({ limit: 1 });

  assert.equal(result.processed, 1);
  assert.equal(result.results[0]?.status, "pending");
});

test("getOperationsSnapshot consolida readiness e fila", async () => {
  const service = createService(
    {
      signatureSession: {
        count: async ({ where }: { where?: { status?: SignatureSessionStatus } }) => {
          switch (where?.status) {
            case SignatureSessionStatus.PENDING:
              return 2;
            case SignatureSessionStatus.FAILED:
              return 1;
            case SignatureSessionStatus.SIGNED:
              return 4;
            default:
              return 0;
          }
        },
        findMany: async () => [
          {
            id: "sig-ops-1",
            documentId: "doc-ops-1",
            provider: SignatureProvider.ICP_BRASIL_VENDOR,
            status: SignatureSessionStatus.PENDING,
            providerReference: "remote-sig-ops-1",
            createdAt: new Date("2026-03-23T09:00:00.000Z"),
            signedAt: null
          }
        ]
      }
    },
    undefined,
    {
      getReadiness: async () => ({
        mode: "remote",
        provider: SignatureProvider.ICP_BRASIL_VENDOR,
        checkedAt: "2026-03-23T12:00:00.000Z",
        configured: true,
        callbackVerificationMode: "hmac",
        capabilities: {
          createSignature: true,
          statusLookup: true,
          callbackSupport: true,
          hmacVerification: true
        },
        connectivity: {
          status: "ok"
        },
        issues: [],
        metadata: {}
      })
    }
  );

  const result = await service.getOperationsSnapshot({
    provider: SignatureProvider.ICP_BRASIL_VENDOR
  });

  assert.equal(result.queue.pending, 2);
  assert.equal(result.queue.failed, 1);
  assert.equal(result.queue.signedToday, 4);
  assert.equal(result.recentSessions[0]?.id, "sig-ops-1");
});

test("getEvidenceBundle consolida documento, artefato e trilha", async () => {
  const service = createService({
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-evidence-1",
        type: "PRESCRIPTION",
        status: DocumentStatus.ISSUED,
        payloadHash: "payload-hash",
        issuedAt: new Date("2026-03-24T10:00:00.000Z"),
        layoutVersion: "prescription-v2",
        pdfArtifact: {
          id: "pdf-evidence-1",
          storageKey: "documents/doc-evidence-1/final.pdf",
          sha256: "pdf-sha",
          createdAt: new Date("2026-03-24T10:00:00.000Z")
        },
        signatures: [
          {
            id: "sig-evidence-1",
            provider: SignatureProvider.ICP_BRASIL_VENDOR,
            status: SignatureSessionStatus.SIGNED,
            policyVersion: "2026.03",
            signatureLevel: "qualified",
            providerReference: "provider-ref-1",
            signedAt: new Date("2026-03-24T10:00:00.000Z"),
            evidence: { providerMode: "remote" }
          }
        ]
      })
    },
    auditLog: {
      findMany: async () => [
        {
          id: "audit-1",
          entityType: "clinical_document",
          entityId: "doc-evidence-1",
          action: "document_signed",
          correlationId: "corr-1",
          origin: "api.signature",
          metadata: {},
          occurredAt: new Date("2026-03-24T10:00:00.000Z")
        }
      ]
    }
  });

  const result = await service.getEvidenceBundle("doc-evidence-1");

  assert.equal(result.document.id, "doc-evidence-1");
  assert.equal(result.artifact?.sha256, "pdf-sha");
  assert.equal(result.latestSignedSession?.id, "sig-evidence-1");
  assert.equal(Boolean(result.evidenceChainHash), true);
  assert.equal(result.auditTrail.length, 1);
});
