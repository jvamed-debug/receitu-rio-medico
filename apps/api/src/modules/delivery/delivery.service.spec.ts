import test from "node:test";
import assert from "node:assert/strict";

import { BadRequestException } from "@nestjs/common";

import { DeliveryService } from "./delivery.service";

test("gera link seguro com expiracao e limite de uso", async () => {
  const createdTokens = [];
  const service = createService({
    clinicalDocument: {
      findUnique: async () => ({
        id: "doc-1"
      })
    },
    documentShareToken: {
      create: async ({ data }) => {
        createdTokens.push(data);
        return {
          id: "share-token-1",
          maxUses: data.maxUses
        };
      }
    },
    deliveryEvent: {
      create: async ({ data }) => ({
        id: "event-1",
        documentId: data.documentId,
        channel: data.channel,
        target: data.target,
        status: data.status,
        createdAt: new Date("2026-03-22T12:00:00.000Z")
      })
    }
  });

  const result = await service.createShareLink({
    documentId: "doc-1",
    principal: {
      userId: "user-1",
      professionalId: "prof-1",
      organizationId: "org-1",
      roles: ["professional"]
    }
  });

  assert.equal(result.documentId, "doc-1");
  assert.equal(result.status, "generated");
  assert.match(result.url, /\/api\/delivery\/share\//);
  assert.equal(createdTokens.length, 1);
});

test("resolve link seguro e decrementa usos restantes", async () => {
  let updated = false;
  const service = createService({
    documentShareToken: {
      findUnique: async () => ({
        id: "share-token-1",
        purpose: "document_secure_share",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: null,
        usedCount: 1,
        maxUses: 5,
        document: {
          id: "doc-1",
          title: "Receita",
          type: "PRESCRIPTION",
          status: "ISSUED",
          issuedAt: new Date("2026-03-22T12:00:00.000Z"),
          pdfArtifact: null
        }
      }),
      update: async () => {
        updated = true;
      }
    }
  });

  const result = await service.resolveShareLink("opaque-token");

  assert.equal(result.tokenId, "share-token-1");
  assert.equal(result.document.id, "doc-1");
  assert.equal(result.remainingUses, 3);
  assert.equal(updated, true);
});

test("falha ao resolver link revogado", async () => {
  const service = createService({
    documentShareToken: {
      findUnique: async () => ({
        id: "share-token-1",
        purpose: "document_secure_share",
        expiresAt: new Date(Date.now() + 60_000),
        revokedAt: new Date(),
        usedCount: 0,
        maxUses: 1,
        document: {
          id: "doc-1",
          title: "Receita",
          type: "PRESCRIPTION",
          status: "ISSUED",
          issuedAt: null,
          pdfArtifact: null
        }
      })
    }
  });

  await assert.rejects(
    service.resolveShareLink("opaque-token"),
    BadRequestException
  );
});

function createService(
  prismaOverrides?: Partial<{
    clinicalDocument: {
      findUnique?: (...args: any[]) => Promise<any>;
    };
    documentShareToken: {
      create?: (...args: any[]) => Promise<any>;
      findUnique?: (...args: any[]) => Promise<any>;
      update?: (...args: any[]) => Promise<any>;
    };
    deliveryEvent: {
      create?: (...args: any[]) => Promise<any>;
    };
  }>,
  complianceOverrides?: Partial<{
    validateBeforeExternalShare: (...args: any[]) => Promise<any>;
  }>
) {
  const prisma = {
    clinicalDocument: {
      findUnique: async () => null,
      ...prismaOverrides?.clinicalDocument
    },
    documentShareToken: {
      create: async () => ({ id: "share-token-1", maxUses: 5 }),
      findUnique: async () => null,
      update: async () => undefined,
      ...prismaOverrides?.documentShareToken
    },
    deliveryEvent: {
      create: async () => ({
        id: "event-1",
        documentId: "doc-1",
        channel: "share-link",
        target: "http://localhost/share",
        status: "generated",
        createdAt: new Date()
      }),
      ...prismaOverrides?.deliveryEvent
    }
  };

  const compliance = {
    validateBeforeExternalShare: async () => ({
      document: {
        id: "doc-1",
        authorProfessionalId: "prof-1",
        type: "PRESCRIPTION"
      },
      policy: {
        shareLinkTtlHours: 24,
        shareLinkMaxUses: 3,
        minimumShareRole: "professional",
        legalBasis: "execucao assistencial",
        processingPurpose: "compartilhamento externo",
        riskLevel: "standard"
      }
    }),
    ...complianceOverrides
  };

  return new DeliveryService(prisma as never, compliance as never);
}
