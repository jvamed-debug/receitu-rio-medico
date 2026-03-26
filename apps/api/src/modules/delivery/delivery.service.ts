import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";

import { PrismaService } from "../../persistence/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AccessPrincipal } from "../auth/auth.types";
import { ComplianceService } from "../compliance/compliance.service";

@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceService: ComplianceService,
    private readonly auditService: AuditService
  ) {}

  channels() {
    return ["email", "share-link", "mobile-native-share"];
  }

  async deliverByEmail(input: { documentId: string; email: string }) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: input.documentId }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    if (!input.email.includes("@")) {
      throw new BadRequestException("E-mail de entrega invalido");
    }

    const deliveryEvent = await this.prisma.deliveryEvent.create({
      data: {
        documentId: input.documentId,
        channel: "email",
        target: input.email,
        status: "queued",
        metadata: {
          mode: "transactional-email"
        }
      }
    });

    return {
      id: deliveryEvent.id,
      documentId: deliveryEvent.documentId,
      channel: deliveryEvent.channel,
      target: deliveryEvent.target,
      status: deliveryEvent.status,
      createdAt: deliveryEvent.createdAt.toISOString()
    };
  }

  async createShareLink(input: { documentId: string; principal: AccessPrincipal }) {
    const { document, policy } = await this.complianceService.validateBeforeExternalShare({
      documentId: input.documentId,
      principal: input.principal
    });

    const plainToken = randomBytes(24).toString("base64url");
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date(Date.now() + policy.shareLinkTtlHours * 60 * 60 * 1000);
    const shareToken = await this.prisma.documentShareToken.create({
      data: {
        documentId: input.documentId,
        tokenHash,
        purpose: "document_secure_share",
        expiresAt,
        maxUses: policy.shareLinkMaxUses,
        createdByUserId: document.authorProfessionalId,
        metadata: {
          channel: "share-link",
          documentType: document.type,
          policy: {
            ttlHours: policy.shareLinkTtlHours,
            maxUses: policy.shareLinkMaxUses,
            minimumShareRole: policy.minimumShareRole,
            legalBasis: policy.legalBasis,
            processingPurpose: policy.processingPurpose,
            riskLevel: policy.riskLevel
          }
        }
      }
    });
    const shareUrl = `${this.getPublicBaseUrl()}/api/delivery/share/${plainToken}`;
    const deliveryEvent = await this.prisma.deliveryEvent.create({
      data: {
        documentId: input.documentId,
        channel: "share-link",
        target: shareUrl,
        status: "generated",
        metadata: {
          linkType: "secure-share",
          shareTokenId: shareToken.id,
          expiresAt: expiresAt.toISOString(),
          maxUses: shareToken.maxUses
        }
      }
    });

    return {
      id: deliveryEvent.id,
      documentId: input.documentId,
      url: shareUrl,
      status: deliveryEvent.status,
      expiresAt: expiresAt.toISOString(),
      maxUses: shareToken.maxUses,
      createdAt: deliveryEvent.createdAt.toISOString()
    };
  }

  async resolveShareLink(
    token: string,
    requestContext?: {
      ip?: string;
      userAgent?: string;
      origin?: string;
    }
  ) {
    const shareToken = await this.prisma.documentShareToken.findUnique({
      where: {
        tokenHash: this.hashToken(token)
      },
      include: {
        document: {
          include: {
            pdfArtifact: true
          }
        }
      }
    });

    if (!shareToken) {
      throw new NotFoundException("Link seguro nao encontrado");
    }

    if (shareToken.revokedAt) {
      throw new BadRequestException("Link seguro revogado");
    }

    if (shareToken.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException("Link seguro expirado");
    }

    if (shareToken.usedCount >= shareToken.maxUses) {
      throw new BadRequestException("Link seguro excedeu o limite de acessos");
    }

    const policy = await this.complianceService.getPolicyForDocument({
      documentType: toDomainDocumentType(shareToken.document.type),
      organizationId: shareToken.document.organizationId
    });
    const nextUsedCount = shareToken.usedCount + 1;

    await this.prisma.documentShareToken.update({
      where: { id: shareToken.id },
      data: {
        usedCount: {
          increment: 1
        },
        lastUsedAt: new Date(),
        metadata: mergeJsonRecord(shareToken.metadata, {
          lastResolvedAt: new Date().toISOString(),
          lastResolvedIp: requestContext?.ip ?? null,
          lastResolvedUserAgent: requestContext?.userAgent ?? null,
          lastResolvedOrigin: requestContext?.origin ?? null
        })
      }
    });

    await this.auditService.log({
      entityType: "document_share_token",
      entityId: shareToken.id,
      action: "share_link_resolved",
      origin: "api.delivery.public-share",
      metadata: {
        documentId: shareToken.document.id,
        documentType: shareToken.document.type,
        riskLevel: policy.riskLevel,
        remainingUses: Math.max(shareToken.maxUses - nextUsedCount, 0),
        requestContext: {
          ip: requestContext?.ip ?? undefined,
          userAgent: requestContext?.userAgent ?? undefined,
          origin: requestContext?.origin ?? undefined
        }
      }
    });

    return {
      tokenId: shareToken.id,
      purpose: shareToken.purpose,
      expiresAt: shareToken.expiresAt.toISOString(),
      remainingUses: Math.max(shareToken.maxUses - nextUsedCount, 0),
      riskLevel: policy.riskLevel,
      accessMode: policy.riskLevel === "high" ? "view-only" : "standard",
      document: {
        id: shareToken.document.id,
        title: shareToken.document.title,
        type: shareToken.document.type,
        status: shareToken.document.status,
        issuedAt: shareToken.document.issuedAt?.toISOString() ?? null,
        artifact: shareToken.document.pdfArtifact
          ? {
              available: true,
              createdAt: shareToken.document.pdfArtifact.createdAt.toISOString(),
              downloadAllowed: policy.riskLevel !== "high"
            }
          : null
      }
    };
  }

  async revokeShareLinks(documentId: string) {
    const result = await this.prisma.documentShareToken.updateMany({
      where: {
        documentId,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return {
      documentId,
      revoked: result.count
    };
  }

  async listByDocument(documentId: string) {
    const events = await this.prisma.deliveryEvent.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" }
    });

    return events.map((event) => ({
      id: event.id,
      channel: event.channel,
      target: event.target,
      status: event.status,
      metadata: event.metadata,
      createdAt: event.createdAt.toISOString()
    }));
  }

  private hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }

  private getPublicBaseUrl() {
    return (
      process.env.API_PUBLIC_URL ??
      process.env.APP_PUBLIC_URL ??
      `http://localhost:${process.env.PORT ?? "3001"}`
    );
  }
}

function toDomainDocumentType(type: string) {
  switch (type) {
    case "PRESCRIPTION":
      return "prescription" as const;
    case "EXAM_REQUEST":
      return "exam-request" as const;
    case "MEDICAL_CERTIFICATE":
      return "medical-certificate" as const;
    case "FREE_DOCUMENT":
    default:
      return "free-document" as const;
  }
}

function mergeJsonRecord(current: unknown, next: Record<string, unknown>) {
  const currentObject =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};

  return {
    ...currentObject,
    ...next
  } as Prisma.InputJsonObject;
}
