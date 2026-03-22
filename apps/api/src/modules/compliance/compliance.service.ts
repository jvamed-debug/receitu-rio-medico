import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import {
  DocumentStatus,
  DocumentType,
  ProfessionalStatus,
  SignatureProvider
} from "@prisma/client";
import type { ClinicalDocumentType } from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";

type SignatureLevel = "advanced" | "qualified";

type DocumentCompliancePolicy = {
  documentType: ClinicalDocumentType;
  signatureLevel: SignatureLevel;
  temporaryWindowAllowed: boolean;
  requiresActiveProfessional: boolean;
  requiresConfiguredSignature: boolean;
  blocksEditingAfterIssue: boolean;
  externalShareAllowed: boolean;
  shareLinkTtlHours: number;
  shareLinkMaxUses: number;
};

const policies: Record<ClinicalDocumentType, DocumentCompliancePolicy> = {
  prescription: {
    documentType: "prescription",
    signatureLevel: "qualified",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    blocksEditingAfterIssue: true,
    externalShareAllowed: true,
    shareLinkTtlHours: 24,
    shareLinkMaxUses: 3
  },
  "exam-request": {
    documentType: "exam-request",
    signatureLevel: "advanced",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    blocksEditingAfterIssue: true,
    externalShareAllowed: true,
    shareLinkTtlHours: 72,
    shareLinkMaxUses: 5
  },
  "medical-certificate": {
    documentType: "medical-certificate",
    signatureLevel: "advanced",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    blocksEditingAfterIssue: true,
    externalShareAllowed: true,
    shareLinkTtlHours: 48,
    shareLinkMaxUses: 3
  },
  "free-document": {
    documentType: "free-document",
    signatureLevel: "advanced",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    blocksEditingAfterIssue: true,
    externalShareAllowed: false,
    shareLinkTtlHours: 12,
    shareLinkMaxUses: 1
  }
};

const prismaTypeToDomain: Record<DocumentType, ClinicalDocumentType> = {
  PRESCRIPTION: "prescription",
  EXAM_REQUEST: "exam-request",
  MEDICAL_CERTIFICATE: "medical-certificate",
  FREE_DOCUMENT: "free-document"
};

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  listPolicies() {
    return Object.values(policies);
  }

  getPolicy(documentType: ClinicalDocumentType) {
    return policies[documentType];
  }

  validateDraft(documentType: ClinicalDocumentType, input: Record<string, unknown>) {
    const issues: string[] = [];

    if (!String(input.patientId ?? "").trim()) {
      issues.push("Paciente obrigatorio para emissao do documento");
    }

    if (!String(input.authorProfessionalId ?? "").trim()) {
      issues.push("Profissional autor obrigatorio para emissao do documento");
    }

    if (!String(input.title ?? "").trim() || String(input.title ?? "").trim().length < 3) {
      issues.push("Titulo do documento deve ter pelo menos 3 caracteres");
    }

    switch (documentType) {
      case "prescription": {
        const items = Array.isArray(input.items) ? input.items : [];

        if (items.length === 0) {
          issues.push("Prescricao deve conter ao menos um item");
        }

        items.forEach((item, index) => {
          const currentItem = item as Record<string, unknown>;
          if (!String(currentItem.medicationName ?? "").trim()) {
            issues.push(`Item ${index + 1}: nome do medicamento obrigatorio`);
          }

          if (!String(currentItem.dosage ?? "").trim()) {
            issues.push(`Item ${index + 1}: posologia/dosagem obrigatoria`);
          }
        });
        break;
      }
      case "exam-request": {
        const requestedExams = Array.isArray(input.requestedExams) ? input.requestedExams : [];

        if (requestedExams.length === 0) {
          issues.push("Solicitacao de exames deve conter ao menos um exame");
        }
        break;
      }
      case "medical-certificate":
        if (!String(input.purpose ?? "").trim() || String(input.purpose ?? "").trim().length < 3) {
          issues.push("Finalidade do atestado obrigatoria");
        }
        break;
      case "free-document":
        if (!String(input.body ?? "").trim() || String(input.body ?? "").trim().length < 10) {
          issues.push("Documento livre deve conter corpo com pelo menos 10 caracteres");
        }
        break;
    }

    if (issues.length > 0) {
      throw new BadRequestException({
        message: "Documento em desconformidade com a politica minima de compliance",
        issues,
        policy: this.getPolicy(documentType)
      });
    }

    return {
      status: "ready_for_review" as const,
      policy: this.getPolicy(documentType)
    };
  }

  async validateBeforeSignature(input: {
    documentId: string;
    professionalId: string;
    provider?: string;
  }) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: input.documentId }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    if (document.authorProfessionalId !== input.professionalId) {
      throw new BadRequestException("Documento nao pertence ao profissional autenticado");
    }

    if (
      document.status === DocumentStatus.ISSUED ||
      document.status === DocumentStatus.DELIVERED ||
      document.status === DocumentStatus.ARCHIVED
    ) {
      throw new BadRequestException("Documento emitido nao pode ser assinado novamente");
    }

    if (
      document.status !== DocumentStatus.READY_FOR_REVIEW &&
      document.status !== DocumentStatus.PENDING_SIGNATURE
    ) {
      throw new BadRequestException(
        "Documento precisa estar pronto para revisao antes da assinatura"
      );
    }

    const professional = await this.prisma.professionalProfile.findUnique({
      where: { id: input.professionalId }
    });

    if (!professional) {
      throw new NotFoundException("Perfil profissional nao encontrado");
    }

    if (professional.status !== ProfessionalStatus.ACTIVE) {
      throw new BadRequestException(
        "Perfil profissional precisa estar ativo para emitir documento"
      );
    }

    const policy = this.getPolicy(prismaTypeToDomain[document.type]);
    const configuredProvider = input.provider
      ? input.provider === "GOVBR_VENDOR"
        ? SignatureProvider.GOVBR_VENDOR
        : SignatureProvider.ICP_BRASIL_VENDOR
      : professional.signatureProvider;

    if (policy.requiresConfiguredSignature && !configuredProvider) {
      throw new BadRequestException(
        "Metodo de assinatura nao configurado para o profissional"
      );
    }

    if (
      policy.signatureLevel === "qualified" &&
      configuredProvider !== SignatureProvider.ICP_BRASIL_VENDOR
    ) {
      throw new BadRequestException(
        "Este tipo documental exige assinatura qualificada ICP-Brasil"
      );
    }

    return {
      policy,
      document,
      professional,
      provider: configuredProvider
    };
  }

  async validateBeforeExternalShare(input: {
    documentId: string;
    professionalId: string;
  }) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: input.documentId }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    if (document.authorProfessionalId !== input.professionalId) {
      throw new BadRequestException("Documento nao pertence ao profissional autenticado");
    }

    const policy = this.getPolicy(prismaTypeToDomain[document.type]);

    if (!policy.externalShareAllowed) {
      throw new BadRequestException(
        "Este tipo documental nao permite compartilhamento externo por link"
      );
    }

    if (
      document.status !== DocumentStatus.SIGNED &&
      document.status !== DocumentStatus.ISSUED &&
      document.status !== DocumentStatus.DELIVERED
    ) {
      throw new BadRequestException(
        "Documento precisa estar assinado ou emitido antes do compartilhamento externo"
      );
    }

    return {
      document,
      policy
    };
  }
}
