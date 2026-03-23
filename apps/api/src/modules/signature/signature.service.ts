import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  DocumentStatus,
  Prisma,
  SignatureProvider,
  SignatureSessionStatus
} from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { ComplianceService } from "../compliance/compliance.service";
import { PrismaService } from "../../persistence/prisma.service";
import { SignatureProviderGateway } from "./signature-provider.gateway";

type SignatureWindowRecord = {
  id: string;
  professionalId: string;
  durationMinutes: number;
  validUntil: string;
  createdAt: string;
};

@Injectable()
export class SignatureService {
  private readonly windows = new Map<string, SignatureWindowRecord>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly complianceService: ComplianceService,
    private readonly signatureProviderGateway: SignatureProviderGateway
  ) {}

  async createSession(input: {
    professionalId: string;
    documentId: string;
    provider: string;
    signatureLevel?: "advanced" | "qualified";
    policyVersion?: string;
    evidence?: Record<string, unknown>;
    expiresAt?: Date;
  }) {
    const provider =
      input.provider === "GOVBR_VENDOR"
        ? SignatureProvider.GOVBR_VENDOR
        : SignatureProvider.ICP_BRASIL_VENDOR;

    const session = await this.prisma.signatureSession.create({
      data: {
        professionalId: input.professionalId,
        documentId: input.documentId,
        provider,
        signatureLevel: input.signatureLevel,
        policyVersion: input.policyVersion,
        evidence: input.evidence as unknown as Prisma.InputJsonValue,
        status: SignatureSessionStatus.PENDING,
        expiresAt: input.expiresAt
      }
    });

    return {
      id: session.id,
      documentId: session.documentId,
      provider: session.provider,
      signatureLevel: session.signatureLevel,
      policyVersion: session.policyVersion,
      status: session.status,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString()
    };
  }

  async createWindow(input: {
    professionalId: string;
    durationMinutes: number;
  }) {
    if (input.durationMinutes < 5 || input.durationMinutes > 480) {
      throw new BadRequestException("Duracao da janela fora da politica permitida");
    }

    const windowRecord: SignatureWindowRecord = {
      id: `signature-window-${Date.now()}`,
      professionalId: input.professionalId,
      durationMinutes: input.durationMinutes,
      validUntil: new Date(
        Date.now() + input.durationMinutes * 60 * 1000
      ).toISOString(),
      createdAt: new Date().toISOString()
    };

    this.windows.set(input.professionalId, windowRecord);
    await this.auditService.log({
      actorProfessionalId: input.professionalId,
      entityType: "signature_window",
      entityId: windowRecord.id,
      action: "signature_window_opened",
      origin: "api.signature",
      metadata: {
        durationMinutes: windowRecord.durationMinutes,
        validUntil: windowRecord.validUntil
      }
    });
    return windowRecord;
  }

  getActiveWindow(professionalId: string) {
    const windowRecord = this.windows.get(professionalId);

    if (!windowRecord) {
      return null;
    }

    if (new Date(windowRecord.validUntil).getTime() <= Date.now()) {
      this.windows.delete(professionalId);
      return null;
    }

    return windowRecord;
  }

  async signDocument(input: {
    professionalId: string;
    documentId: string;
    provider?: string;
    requestContext?: {
      ip?: string;
      userAgent?: string;
      origin?: string;
    };
  }) {
    const compliance = await this.complianceService.validateBeforeSignature(input);
    const document = compliance.document;
    const provider = compliance.provider ?? SignatureProvider.ICP_BRASIL_VENDOR;
    const complianceRecord = this.complianceService.buildSignatureComplianceRecord({
      policy: compliance.policy,
      provider,
      professional: compliance.professional
    });

    const activeWindow = this.getActiveWindow(input.professionalId);
    const session = await this.createSession({
      professionalId: input.professionalId,
      documentId: input.documentId,
      provider,
      signatureLevel: compliance.policy.signatureLevel,
      policyVersion: compliance.policy.policyVersion,
      evidence: {
        ...complianceRecord,
        requestContext: {
          ip: input.requestContext?.ip ?? undefined,
          userAgent: input.requestContext?.userAgent ?? undefined,
          origin: input.requestContext?.origin ?? undefined
        },
        temporaryWindowUsed: activeWindow != null
      },
      expiresAt: activeWindow ? new Date(activeWindow.validUntil) : undefined
    });

    let providerResult;

    try {
      providerResult = await this.signatureProviderGateway.sign({
        sessionId: session.id,
        documentId: input.documentId,
        professionalId: input.professionalId,
        provider,
        signatureLevel: compliance.policy.signatureLevel,
        policyVersion: compliance.policy.policyVersion,
        expiresAt: session.expiresAt,
        requestContext: input.requestContext
      });
    } catch (error) {
      await this.prisma.signatureSession.update({
        where: { id: session.id },
        data: {
          status: SignatureSessionStatus.FAILED,
          evidence: {
            ...complianceRecord,
            requestContext: {
              ip: input.requestContext?.ip ?? undefined,
              userAgent: input.requestContext?.userAgent ?? undefined,
              origin: input.requestContext?.origin ?? undefined
            },
            temporaryWindowUsed: activeWindow != null,
            failure: error instanceof Error ? error.message : "provider_failed"
          } as unknown as Prisma.InputJsonValue
        }
      });

      await this.auditService.log({
        actorProfessionalId: input.professionalId,
        entityType: "signature_session",
        entityId: session.id,
        action: "signature_failed",
        origin: "api.signature",
        metadata: {
          provider,
          policyVersion: compliance.policy.policyVersion,
          reason: error instanceof Error ? error.message : "provider_failed"
        }
      });

      throw error;
    }

    await this.prisma.signatureSession.update({
      where: { id: session.id },
      data: {
        status: SignatureSessionStatus.SIGNED,
        signedAt: new Date(providerResult.signedAt),
        providerReference: providerResult.externalReference,
        evidence: {
          ...complianceRecord,
          requestContext: {
            ip: input.requestContext?.ip ?? undefined,
            userAgent: input.requestContext?.userAgent ?? undefined,
            origin: input.requestContext?.origin ?? undefined
          },
          temporaryWindowUsed: activeWindow != null,
          providerEvidence: providerResult.evidence
        } as unknown as Prisma.InputJsonValue
      }
    });

    const updatedDocument = await this.prisma.clinicalDocument.update({
      where: { id: input.documentId },
      data: {
        status: DocumentStatus.ISSUED,
        issuedAt: new Date()
      }
    });

    const pdfArtifact = await this.ensurePdfArtifact(updatedDocument.id);

    await this.auditService.log({
      actorProfessionalId: input.professionalId,
      entityType: "clinical_document",
      entityId: updatedDocument.id,
      action: "document_signed",
      origin: "api.signature",
      metadata: {
        provider,
        sessionId: session.id,
        providerReference: providerResult.externalReference,
        usedWindow: activeWindow != null,
        pdfArtifactId: pdfArtifact.id,
        signatureLevel: compliance.policy.signatureLevel,
        policyVersion: compliance.policy.policyVersion,
        retentionCategory: compliance.policy.retentionCategory,
        requestContext: {
          ip: input.requestContext?.ip ?? undefined,
          userAgent: input.requestContext?.userAgent ?? undefined,
          origin: input.requestContext?.origin ?? undefined
        }
      }
    });

    return {
      sessionId: session.id,
      documentId: updatedDocument.id,
      status: updatedDocument.status,
      issuedAt: updatedDocument.issuedAt?.toISOString() ?? null,
      usedWindow: activeWindow != null,
      pdfArtifact
    };
  }

  async ensurePdfArtifact(documentId: string) {
    const existingArtifact = await this.prisma.pdfArtifact.findUnique({
      where: { documentId }
    });

    if (existingArtifact) {
      return {
        id: existingArtifact.id,
        storageKey: existingArtifact.storageKey,
        sha256: existingArtifact.sha256
      };
    }

    const artifact = await this.prisma.pdfArtifact.create({
      data: {
        documentId,
        storageKey: `documents/${documentId}/final.pdf`,
        sha256: `sha256-${documentId}`,
        metadata: {
          generator: "pdf-core-v1",
          version: "v1"
        }
      }
    });

    return {
      id: artifact.id,
      storageKey: artifact.storageKey,
      sha256: artifact.sha256
    };
  }

  async listDocumentSessions(documentId: string) {
    const sessions = await this.prisma.signatureSession.findMany({
      where: { documentId },
      orderBy: { createdAt: "desc" }
    });

    return sessions.map((session) => ({
      id: session.id,
      provider: session.provider,
      signatureLevel: session.signatureLevel,
      policyVersion: session.policyVersion,
      status: session.status,
      signedAt: session.signedAt?.toISOString() ?? null,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      providerReference: session.providerReference ?? null,
      evidence: session.evidence ?? null,
      createdAt: session.createdAt.toISOString()
    }));
  }
}
