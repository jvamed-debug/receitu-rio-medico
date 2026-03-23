import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DocumentStatus,
  DocumentType,
  ProfessionalStatus,
  SignatureProvider
} from "@prisma/client";
import type { ClinicalDocumentType } from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import type { AccessPrincipal } from "../auth/auth.types";

type SignatureLevel = "advanced" | "qualified";

type DocumentCompliancePolicy = {
  documentType: ClinicalDocumentType;
  policyVersion: string;
  signatureLevel: SignatureLevel;
  temporaryWindowAllowed: boolean;
  requiresActiveProfessional: boolean;
  requiresConfiguredSignature: boolean;
  requiresCouncilType: boolean;
  requiresCouncilState: boolean;
  requiresDocumentNumber: boolean;
  requiresRqe: boolean;
  blocksEditingAfterIssue: boolean;
  externalShareAllowed: boolean;
  shareLinkTtlHours: number;
  shareLinkMaxUses: number;
  titleMinLength: number;
  retentionCategory: "clinical_record" | "medical_certificate" | "prescription";
};

const policies: Record<ClinicalDocumentType, DocumentCompliancePolicy> = {
  prescription: {
    documentType: "prescription",
    policyVersion: "2026.03",
    signatureLevel: "qualified",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    requiresCouncilType: true,
    requiresCouncilState: true,
    requiresDocumentNumber: true,
    requiresRqe: false,
    blocksEditingAfterIssue: true,
    externalShareAllowed: true,
    shareLinkTtlHours: 24,
    shareLinkMaxUses: 3,
    titleMinLength: 3,
    retentionCategory: "prescription"
  },
  "exam-request": {
    documentType: "exam-request",
    policyVersion: "2026.03",
    signatureLevel: "advanced",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    requiresCouncilType: true,
    requiresCouncilState: true,
    requiresDocumentNumber: true,
    requiresRqe: false,
    blocksEditingAfterIssue: true,
    externalShareAllowed: true,
    shareLinkTtlHours: 72,
    shareLinkMaxUses: 5,
    titleMinLength: 3,
    retentionCategory: "clinical_record"
  },
  "medical-certificate": {
    documentType: "medical-certificate",
    policyVersion: "2026.03",
    signatureLevel: "advanced",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    requiresCouncilType: true,
    requiresCouncilState: true,
    requiresDocumentNumber: true,
    requiresRqe: false,
    blocksEditingAfterIssue: true,
    externalShareAllowed: true,
    shareLinkTtlHours: 48,
    shareLinkMaxUses: 3,
    titleMinLength: 3,
    retentionCategory: "medical_certificate"
  },
  "free-document": {
    documentType: "free-document",
    policyVersion: "2026.03",
    signatureLevel: "advanced",
    temporaryWindowAllowed: true,
    requiresActiveProfessional: true,
    requiresConfiguredSignature: true,
    requiresCouncilType: true,
    requiresCouncilState: true,
    requiresDocumentNumber: true,
    requiresRqe: false,
    blocksEditingAfterIssue: true,
    externalShareAllowed: false,
    shareLinkTtlHours: 12,
    shareLinkMaxUses: 1,
    titleMinLength: 3,
    retentionCategory: "clinical_record"
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService
  ) {}

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

    const policy = this.getPolicy(documentType);

    if (
      !String(input.title ?? "").trim() ||
      String(input.title ?? "").trim().length < policy.titleMinLength
    ) {
      issues.push(
        `Titulo do documento deve ter pelo menos ${policy.titleMinLength} caracteres`
      );
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
        policy
      });
    }

    return {
      status: "ready_for_review" as const,
      policy
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

    this.validateProfessionalReadiness(professional, policy);

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

  buildSignatureComplianceRecord(input: {
    policy: DocumentCompliancePolicy;
    provider: SignatureProvider;
    professional: {
      id: string;
      status: ProfessionalStatus;
      councilType: string;
      councilState: string;
      documentNumber: string;
      rqe: string | null;
      signatureValidatedAt: Date | null;
    };
  }) {
    return {
      policyVersion: input.policy.policyVersion,
      signatureLevel: input.policy.signatureLevel,
      retentionCategory: input.policy.retentionCategory,
      provider: input.provider,
      professional: {
        id: input.professional.id,
        status: input.professional.status,
        councilType: input.professional.councilType,
        councilState: input.professional.councilState,
        documentNumber: input.professional.documentNumber,
        rqe: input.professional.rqe ?? undefined,
        signatureValidatedAt:
          input.professional.signatureValidatedAt?.toISOString() ?? undefined
      },
      evaluatedAt: new Date().toISOString()
    };
  }

  getRetentionPolicySnapshot() {
    const categoryDays = {
      clinical_record: this.getRetentionDays("clinical_record", 3650),
      medical_certificate: this.getRetentionDays("medical_certificate", 1825),
      prescription: this.getRetentionDays("prescription", 1825)
    } as const;
    const archiveAfterDays = this.getArchiveAfterDays();

    return {
      policyVersion: "2026.03-retention",
      archiveAfterDays,
      categories: categoryDays,
      documentTypes: Object.values(policies).map((policy) => ({
        documentType: policy.documentType,
        retentionCategory: policy.retentionCategory,
        retentionDays: categoryDays[policy.retentionCategory],
        archiveAfterDays,
        disposalMode: "review_before_disposal",
        anonymizedAnalyticsAllowed: true
      }))
    };
  }

  async getRetentionOperationsSummary(principal: AccessPrincipal) {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: buildDocumentComplianceScope(principal),
      select: {
        id: true,
        type: true,
        issuedAt: true,
        createdAt: true,
        status: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });
    const documentIds = documents.map((document) => document.id);
    const shareTokens = await this.prisma.documentShareToken.findMany({
      where: {
        documentId: {
          in: documentIds.length > 0 ? documentIds : ["__none__"]
        }
      },
      select: {
        revokedAt: true,
        expiresAt: true
      }
    });

    const now = Date.now();
    const archiveAfterMs = this.getArchiveAfterDays() * DAY_MS;
    let archiveCandidates = 0;
    let disposalCandidates = 0;
    let oldestArchiveCandidateAt: string | undefined;
    let oldestDisposalCandidateAt: string | undefined;

    for (const document of documents) {
      const policy = this.getPolicy(prismaTypeToDomain[document.type]);
      const basisDate = document.issuedAt ?? document.createdAt;
      const ageMs = now - basisDate.getTime();

      if (ageMs >= archiveAfterMs && document.status !== DocumentStatus.ARCHIVED) {
        archiveCandidates += 1;
        if (!oldestArchiveCandidateAt) {
          oldestArchiveCandidateAt = basisDate.toISOString();
        }
      }

      if (ageMs >= this.getRetentionDays(policy.retentionCategory, 3650) * DAY_MS) {
        disposalCandidates += 1;
        if (!oldestDisposalCandidateAt) {
          oldestDisposalCandidateAt = basisDate.toISOString();
        }
      }
    }

    const activeShareLinks = shareTokens.filter(
      (token) => !token.revokedAt && token.expiresAt.getTime() > now
    ).length;
    const expiredShareLinks = shareTokens.filter(
      (token) => token.expiresAt.getTime() <= now
    ).length;

    return {
      retentionPolicy: this.getRetentionPolicySnapshot(),
      totals: {
        documentsInScope: documents.length,
        archiveCandidates,
        disposalCandidates,
        activeShareLinks,
        expiredShareLinks
      },
      oldestArchiveCandidateAt,
      oldestDisposalCandidateAt
    };
  }

  async getAnonymizedAnalyticsSnapshot(
    principal: AccessPrincipal,
    filters?: {
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    const dateFrom = filters?.dateFrom ? new Date(filters.dateFrom) : undefined;
    const dateTo = filters?.dateTo ? new Date(filters.dateTo) : undefined;
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        ...buildDocumentComplianceScope(principal),
        ...(dateFrom || dateTo
          ? {
              createdAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {})
              }
            }
          : {})
      },
      select: {
        type: true,
        status: true,
        createdAt: true
      }
    });
    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...buildAppointmentComplianceScope(principal),
        ...(dateFrom || dateTo
          ? {
              appointmentAt: {
                ...(dateFrom ? { gte: dateFrom } : {}),
                ...(dateTo ? { lte: dateTo } : {})
              }
            }
          : {})
      },
      select: {
        status: true,
        telehealth: true,
        appointmentAt: true
      }
    });

    const documentsByType = documents.reduce<Record<string, number>>((acc, document) => {
      const key = prismaTypeToDomain[document.type];
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const documentsByStatus = documents.reduce<Record<string, number>>((acc, document) => {
      const key = document.status.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const appointmentsByStatus = appointments.reduce<Record<string, number>>((acc, appointment) => {
      const key = appointment.status.toLowerCase();
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    const dailyActivity = new Map<string, { documents: number; appointments: number }>();

    for (const document of documents) {
      const day = document.createdAt.toISOString().slice(0, 10);
      const bucket = dailyActivity.get(day) ?? { documents: 0, appointments: 0 };
      bucket.documents += 1;
      dailyActivity.set(day, bucket);
    }

    for (const appointment of appointments) {
      const day = appointment.appointmentAt.toISOString().slice(0, 10);
      const bucket = dailyActivity.get(day) ?? { documents: 0, appointments: 0 };
      bucket.appointments += 1;
      dailyActivity.set(day, bucket);
    }

    return {
      scope: {
        organizationScoped: !principal.roles.some(
          (role) => role === "admin" || role === "compliance"
        ),
        range: {
          dateFrom: dateFrom?.toISOString(),
          dateTo: dateTo?.toISOString()
        }
      },
      documents: {
        total: documents.length,
        byType: documentsByType,
        byStatus: documentsByStatus
      },
      appointments: {
        total: appointments.length,
        telehealth: appointments.filter((appointment) => appointment.telehealth).length,
        byStatus: appointmentsByStatus
      },
      dailyActivity: [...dailyActivity.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([date, counts]) => ({
          date,
          ...counts
        }))
    };
  }

  private validateProfessionalReadiness(
    professional: {
      documentNumber: string;
      councilType: string;
      councilState: string;
      rqe: string | null;
    },
    policy: DocumentCompliancePolicy
  ) {
    const issues: string[] = [];

    if (policy.requiresDocumentNumber && !professional.documentNumber?.trim()) {
      issues.push("Numero profissional obrigatorio para este tipo documental");
    }

    if (policy.requiresCouncilType && !professional.councilType?.trim()) {
      issues.push("Conselho profissional obrigatorio para este tipo documental");
    }

    if (policy.requiresCouncilState && !professional.councilState?.trim()) {
      issues.push("UF do conselho obrigatoria para este tipo documental");
    }

    if (policy.requiresRqe && !professional.rqe?.trim()) {
      issues.push("RQE obrigatorio para este tipo documental");
    }

    if (issues.length > 0) {
      throw new BadRequestException({
        message: "Perfil profissional incompleto para emissao regulada",
        issues,
        policy
      });
    }
  }

  private getRetentionDays(
    category: "clinical_record" | "medical_certificate" | "prescription",
    fallback: number
  ) {
    const envKey =
      category === "clinical_record"
        ? "RETENTION_CLINICAL_RECORD_DAYS"
        : category === "medical_certificate"
          ? "RETENTION_MEDICAL_CERTIFICATE_DAYS"
          : "RETENTION_PRESCRIPTION_DAYS";

    return Number(this.configService.get(envKey) ?? fallback);
  }

  private getArchiveAfterDays() {
    return Number(this.configService.get("RETENTION_ARCHIVE_AFTER_DAYS") ?? 90);
  }
}

const DAY_MS = 24 * 60 * 60 * 1000;

function buildDocumentComplianceScope(principal: AccessPrincipal) {
  if (principal.roles.some((role) => role === "admin" || role === "compliance")) {
    return {};
  }

  return {
    OR: [
      {
        organizationId: principal.organizationId ?? null
      },
      {
        authorProfessionalId: principal.professionalId ?? "__no_access__"
      }
    ]
  };
}

function buildAppointmentComplianceScope(principal: AccessPrincipal) {
  if (principal.roles.some((role) => role === "admin" || role === "compliance")) {
    return {};
  }

  return {
    OR: [
      {
        organizationId: principal.organizationId ?? null
      },
      {
        professionalId: principal.professionalId ?? "__no_access__"
      }
    ]
  };
}
