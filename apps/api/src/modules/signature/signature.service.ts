import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  DocumentStatus,
  SignatureProvider,
  SignatureSessionStatus
} from "@prisma/client";

import { AuditService } from "../audit/audit.service";
import { ComplianceService } from "../compliance/compliance.service";
import { PrismaService } from "../../persistence/prisma.service";

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
    private readonly complianceService: ComplianceService
  ) {}

  async createSession(input: {
    professionalId: string;
    documentId: string;
    provider: string;
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
        status: SignatureSessionStatus.PENDING,
        expiresAt: input.expiresAt
      }
    });

    return {
      id: session.id,
      documentId: session.documentId,
      provider: session.provider,
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
  }) {
    const compliance = await this.complianceService.validateBeforeSignature(input);
    const document = compliance.document;

    const activeWindow = this.getActiveWindow(input.professionalId);
    const session = await this.createSession({
      professionalId: input.professionalId,
      documentId: input.documentId,
      provider: compliance.provider ?? input.provider ?? "ICP_BRASIL_VENDOR",
      expiresAt: activeWindow ? new Date(activeWindow.validUntil) : undefined
    });

    await this.prisma.signatureSession.update({
      where: { id: session.id },
      data: {
        status: SignatureSessionStatus.SIGNED
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
        provider: compliance.provider ?? input.provider ?? "ICP_BRASIL_VENDOR",
        sessionId: session.id,
        usedWindow: activeWindow != null,
        pdfArtifactId: pdfArtifact.id,
        signatureLevel: compliance.policy.signatureLevel
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
      status: session.status,
      expiresAt: session.expiresAt?.toISOString() ?? null,
      createdAt: session.createdAt.toISOString()
    }));
  }
}
