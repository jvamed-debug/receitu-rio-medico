import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  DocumentStatus,
  DocumentType,
  Prisma,
  ProfessionalStatus,
  RetentionReviewStatus,
  RetentionReviewType,
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
  minimumShareRole: "professional" | "admin" | "compliance";
  requiresPatientConsentForExternalShare: boolean;
  riskLevel: "standard" | "high";
  legalBasis: string;
  processingPurpose: string;
  titleMinLength: number;
  retentionCategory: "clinical_record" | "medical_certificate" | "prescription";
};

type OrganizationComplianceSettings = {
  documentSharePolicy: {
    maxUsesDefault: number;
    expirationHoursDefault: number;
    allowHighRiskExternalShare: boolean;
  };
  documentPolicyMatrix: Record<
    ClinicalDocumentType,
    {
      allowExternalShare: boolean;
      requireRqe: boolean;
      minimumShareRole: "professional" | "admin" | "compliance";
      requirePatientConsentForExternalShare: boolean;
      shareLinkTtlHours: number;
      shareLinkMaxUses: number;
    }
  >;
  overridePolicy: {
    minimumReviewerRole: "admin" | "compliance";
    requireInstitutionalReviewForHighSeverity: boolean;
    requireInstitutionalReviewForModerateInteraction: boolean;
    autoAcknowledgePrivilegedOverride: boolean;
  };
  brandingPolicy: {
    allowCustomLogo: boolean;
    lockedLayoutVersion?: string;
  };
  lgpdPolicy: {
    requireConsentForExternalShare: boolean;
    requireDisposalApproval: boolean;
    retentionReviewWindowDays: number;
  };
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
    minimumShareRole: "professional",
    requiresPatientConsentForExternalShare: false,
    riskLevel: "standard",
    legalBasis: "execucao de procedimento assistencial",
    processingPurpose: "emissao e dispensacao de prescricao",
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
    minimumShareRole: "professional",
    requiresPatientConsentForExternalShare: false,
    riskLevel: "standard",
    legalBasis: "execucao de procedimento assistencial",
    processingPurpose: "solicitacao diagnostica e acompanhamento clinico",
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
    minimumShareRole: "professional",
    requiresPatientConsentForExternalShare: true,
    riskLevel: "high",
    legalBasis: "cumprimento de obrigacao assistencial e documental",
    processingPurpose: "formalizacao de atestado medico",
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
    minimumShareRole: "admin",
    requiresPatientConsentForExternalShare: true,
    riskLevel: "high",
    legalBasis: "registro clinico e comunicacao assistencial",
    processingPurpose: "documento clinico livre e comunicacao regulada",
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

  async listPoliciesForPrincipal(principal: AccessPrincipal) {
    const organizationSettings = await this.getOrganizationSettings(principal.organizationId);
    return Object.values(policies).map((policy) =>
      this.applyInstitutionalPolicy(policy, organizationSettings)
    );
  }

  async getPolicyForPrincipal(
    documentType: ClinicalDocumentType,
    principal: AccessPrincipal
  ) {
    return this.getEffectivePolicy(documentType, principal.organizationId);
  }

  async validateDraft(documentType: ClinicalDocumentType, input: Record<string, unknown>) {
    const issues: string[] = [];

    if (!String(input.patientId ?? "").trim()) {
      issues.push("Paciente obrigatorio para emissao do documento");
    }

    if (!String(input.authorProfessionalId ?? "").trim()) {
      issues.push("Profissional autor obrigatorio para emissao do documento");
    }

    const policy = await this.getEffectivePolicy(
      documentType,
      typeof input.organizationId === "string" ? input.organizationId : undefined
    );

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

    const policy = await this.getEffectivePolicy(
      prismaTypeToDomain[document.type],
      document.organizationId ?? undefined
    );
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
    principal: AccessPrincipal;
  }) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: input.documentId }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    if (
      document.authorProfessionalId !== input.principal.professionalId &&
      !input.principal.roles.some((role) => role === "admin" || role === "compliance")
    ) {
      throw new BadRequestException("Documento nao pertence ao profissional autenticado");
    }

    const policy = await this.getEffectivePolicy(
      prismaTypeToDomain[document.type],
      document.organizationId ?? undefined
    );

    if (!policy.externalShareAllowed) {
      throw new BadRequestException(
        "Este tipo documental nao permite compartilhamento externo por link"
      );
    }

    if (
      !hasMinimumRole(
        input.principal.roles,
        policy.minimumShareRole
      )
    ) {
      throw new BadRequestException(
        "Perfil atual nao possui papel minimo para compartilhamento externo deste documento"
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

    if (policy.requiresPatientConsentForExternalShare) {
      const activeConsent = await this.findActiveConsent(document.patientId, document.organizationId);
      if (!activeConsent) {
        throw new BadRequestException(
          "Compartilhamento externo exige consentimento ativo do paciente para esta finalidade"
        );
      }
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
      legalBasis: input.policy.legalBasis,
      processingPurpose: input.policy.processingPurpose,
      riskLevel: input.policy.riskLevel,
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

  async getRetentionPolicySnapshot(organizationId?: string) {
    const organizationSettings = await this.getOrganizationSettings(organizationId);
    const categoryDays = {
      clinical_record: this.getRetentionDays("clinical_record", 3650),
      medical_certificate: this.getRetentionDays("medical_certificate", 1825),
      prescription: this.getRetentionDays("prescription", 1825)
    } as const;
    const archiveAfterDays = this.getArchiveAfterDays();

    return {
      policyVersion: "2026.03-retention",
      archiveAfterDays,
      lgpdPolicy: organizationSettings.lgpdPolicy,
      categories: categoryDays,
      documentTypes: Object.values(policies).map((policy) => {
        const effectivePolicy = this.applyInstitutionalPolicy(policy, organizationSettings);
        return {
          documentType: effectivePolicy.documentType,
          retentionCategory: effectivePolicy.retentionCategory,
          retentionDays: categoryDays[effectivePolicy.retentionCategory],
          archiveAfterDays,
          disposalMode: organizationSettings.lgpdPolicy.requireDisposalApproval
            ? "review_before_disposal"
            : "automated_after_retention",
          anonymizedAnalyticsAllowed: true,
          legalBasis: effectivePolicy.legalBasis,
          processingPurpose: effectivePolicy.processingPurpose
        };
      })
    };
  }

  async getRetentionOperationsSummary(principal: AccessPrincipal) {
    const retentionPolicy = await this.getRetentionPolicySnapshot(principal.organizationId);
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
    const pendingReviews = await this.prisma.complianceRetentionReview.count({
      where: {
        ...(principal.organizationId ? { organizationId: principal.organizationId } : {}),
        status: RetentionReviewStatus.PENDING
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
      retentionPolicy,
      totals: {
        documentsInScope: documents.length,
        archiveCandidates,
        disposalCandidates,
        activeShareLinks,
        expiredShareLinks,
        pendingReviews
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

  async listPatientConsents(patientId: string, principal: AccessPrincipal) {
    const consents = await this.prisma.patientConsentRecord.findMany({
      where: {
        patientId,
        ...(principal.organizationId ? { organizationId: principal.organizationId } : {})
      },
      orderBy: [{ grantedAt: "desc" }, { createdAt: "desc" }]
    });

    return consents.map(mapConsentRecord);
  }

  async createPatientConsent(
    patientId: string,
    principal: AccessPrincipal,
    input: {
      consentType: "external_document_share" | "communication" | "analytics" | "optional_services";
      purpose: string;
      legalBasis: string;
      expiresAt?: string;
      metadata?: Record<string, unknown>;
    }
  ) {
    const consent = await this.prisma.patientConsentRecord.create({
      data: {
        patientId,
        organizationId: principal.organizationId,
        professionalId: principal.professionalId ?? "__no_professional__",
        consentType: toConsentType(input.consentType),
        purpose: input.purpose,
        legalBasis: input.legalBasis,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        metadata: input.metadata ? (input.metadata as Prisma.InputJsonObject) : undefined
      }
    });

    return mapConsentRecord(consent);
  }

  async revokePatientConsent(
    patientId: string,
    consentId: string,
    input: { reason?: string },
    principal: AccessPrincipal
  ) {
    const consent = await this.prisma.patientConsentRecord.findFirst({
      where: {
        id: consentId,
        patientId,
        ...(principal.organizationId ? { organizationId: principal.organizationId } : {})
      }
    });

    if (!consent) {
      throw new NotFoundException("Consentimento nao encontrado");
    }

    const updated = await this.prisma.patientConsentRecord.update({
      where: {
        id: consentId
      },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        metadata: mergeJsonRecord(consent.metadata, input.reason ? { revokeReason: input.reason } : {})
      }
    });

    return mapConsentRecord(updated);
  }

  async listRetentionReviews(
    principal: AccessPrincipal,
    query?: { status?: "pending" | "approved" | "rejected" | "executed" }
  ) {
    const reviews = await this.prisma.complianceRetentionReview.findMany({
      where: {
        ...(principal.organizationId ? { organizationId: principal.organizationId } : {}),
        ...(query?.status ? { status: toRetentionReviewStatus(query.status) } : {})
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });

    return reviews.map(mapRetentionReview);
  }

  async runRetentionReviewSweep(
    principal: AccessPrincipal,
    input?: { limit?: number }
  ) {
    const retentionPolicy = await this.getRetentionPolicySnapshot(principal.organizationId);
    const limit = Math.max(1, Math.min(input?.limit ?? 25, 100));
    const documents = await this.prisma.clinicalDocument.findMany({
      where: buildDocumentComplianceScope(principal),
      select: {
        id: true,
        type: true,
        status: true,
        issuedAt: true,
        createdAt: true,
        organizationId: true
      },
      orderBy: {
        createdAt: "asc"
      },
      take: limit
    });

    const created: ReturnType<typeof mapRetentionReview>[] = [];
    const now = Date.now();
    const archiveAfterMs = retentionPolicy.archiveAfterDays * DAY_MS;

    for (const document of documents) {
      const policy = await this.getEffectivePolicy(
        prismaTypeToDomain[document.type],
        document.organizationId ?? undefined
      );
      const basisDate = document.issuedAt ?? document.createdAt;
      const ageMs = now - basisDate.getTime();

      const shouldArchiveReview =
        ageMs >= archiveAfterMs &&
        document.status !== DocumentStatus.ARCHIVED &&
        retentionPolicy.lgpdPolicy.requireDisposalApproval;
      const shouldDisposalReview =
        ageMs >= this.getRetentionDays(policy.retentionCategory, 3650) * DAY_MS &&
        retentionPolicy.lgpdPolicy.requireDisposalApproval;

      if (!shouldArchiveReview && !shouldDisposalReview) {
        continue;
      }

      for (const reviewType of [
        shouldArchiveReview ? RetentionReviewType.ARCHIVE : null,
        shouldDisposalReview ? RetentionReviewType.DISPOSAL : null
      ]) {
        if (!reviewType) {
          continue;
        }

        const existing = await this.prisma.complianceRetentionReview.findFirst({
          where: {
            documentId: document.id,
            reviewType,
            status: RetentionReviewStatus.PENDING
          }
        });

        if (existing) {
          continue;
        }

        const review = await this.prisma.complianceRetentionReview.create({
          data: {
            documentId: document.id,
            organizationId: document.organizationId,
            documentType: document.type,
            retentionCategory: policy.retentionCategory,
            reviewType,
            dueAt: new Date(now + retentionPolicy.lgpdPolicy.retentionReviewWindowDays * DAY_MS),
            rationale:
              reviewType === RetentionReviewType.ARCHIVE
                ? "Documento excedeu janela institucional para arquivamento controlado"
                : "Documento excedeu janela de retencao e requer revisao de descarte",
            requestedByUserId: principal.userId
          }
        });

        created.push(mapRetentionReview(review));
      }
    }

    return {
      created: created.length,
      reviews: created
    };
  }

  async resolveRetentionReview(
    reviewId: string,
    principal: AccessPrincipal,
    input: {
      decision: "approved" | "rejected" | "executed";
      resolutionNotes?: string;
    }
  ) {
    const review = await this.prisma.complianceRetentionReview.findFirst({
      where: {
        id: reviewId,
        ...(principal.organizationId ? { organizationId: principal.organizationId } : {})
      }
    });

    if (!review) {
      throw new NotFoundException("Review de retencao nao encontrado");
    }

    const updated = await this.prisma.complianceRetentionReview.update({
      where: {
        id: reviewId
      },
      data: {
        status: toRetentionReviewStatus(input.decision),
        resolutionNotes: input.resolutionNotes ?? null,
        resolvedAt: new Date(),
        resolvedByUserId: principal.userId
      }
    });

    return mapRetentionReview(updated);
  }

  private async getOrganizationSettings(organizationId?: string) {
    if (!organizationId) {
      return defaultOrganizationComplianceSettings();
    }

    const organization = await this.prisma.organization.findUnique({
      where: {
        id: organizationId
      },
      select: {
        settings: true
      }
    });

    return normalizeOrganizationComplianceSettings(organization?.settings);
  }

  private async getEffectivePolicy(
    documentType: ClinicalDocumentType,
    organizationId?: string
  ) {
    const basePolicy = policies[documentType];
    const organizationSettings = await this.getOrganizationSettings(organizationId);
    return this.applyInstitutionalPolicy(basePolicy, organizationSettings);
  }

  private applyInstitutionalPolicy(
    policy: DocumentCompliancePolicy,
    organizationSettings: OrganizationComplianceSettings
  ): DocumentCompliancePolicy {
    const documentPolicy = organizationSettings.documentPolicyMatrix[policy.documentType];
    const shareAllowedByRisk =
      policy.riskLevel === "high"
        ? organizationSettings.documentSharePolicy.allowHighRiskExternalShare
        : true;

    return {
      ...policy,
      requiresRqe: policy.requiresRqe || documentPolicy.requireRqe,
      externalShareAllowed: policy.externalShareAllowed && documentPolicy.allowExternalShare && shareAllowedByRisk,
      shareLinkTtlHours: documentPolicy.shareLinkTtlHours,
      shareLinkMaxUses: documentPolicy.shareLinkMaxUses,
      minimumShareRole: documentPolicy.minimumShareRole,
      requiresPatientConsentForExternalShare:
        documentPolicy.requirePatientConsentForExternalShare ||
        organizationSettings.lgpdPolicy.requireConsentForExternalShare ||
        policy.requiresPatientConsentForExternalShare
    };
  }

  private async findActiveConsent(patientId: string, organizationId?: string | null) {
    const now = new Date();
    return this.prisma.patientConsentRecord.findFirst({
      where: {
        patientId,
        consentType: "EXTERNAL_DOCUMENT_SHARE",
        status: "GRANTED",
        ...(organizationId ? { organizationId } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }]
      },
      orderBy: [{ grantedAt: "desc" }, { createdAt: "desc" }]
    });
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

function defaultOrganizationComplianceSettings(): OrganizationComplianceSettings {
  return {
    documentSharePolicy: {
      maxUsesDefault: 3,
      expirationHoursDefault: 72,
      allowHighRiskExternalShare: false
    },
    documentPolicyMatrix: {
      prescription: {
        allowExternalShare: true,
        requireRqe: false,
        minimumShareRole: "professional",
        requirePatientConsentForExternalShare: false,
        shareLinkTtlHours: 24,
        shareLinkMaxUses: 3
      },
      "exam-request": {
        allowExternalShare: true,
        requireRqe: false,
        minimumShareRole: "professional",
        requirePatientConsentForExternalShare: false,
        shareLinkTtlHours: 72,
        shareLinkMaxUses: 5
      },
      "medical-certificate": {
        allowExternalShare: true,
        requireRqe: false,
        minimumShareRole: "professional",
        requirePatientConsentForExternalShare: true,
        shareLinkTtlHours: 48,
        shareLinkMaxUses: 3
      },
      "free-document": {
        allowExternalShare: false,
        requireRqe: false,
        minimumShareRole: "admin",
        requirePatientConsentForExternalShare: true,
        shareLinkTtlHours: 12,
        shareLinkMaxUses: 1
      }
    },
    overridePolicy: {
      minimumReviewerRole: "compliance",
      requireInstitutionalReviewForHighSeverity: true,
      requireInstitutionalReviewForModerateInteraction: true,
      autoAcknowledgePrivilegedOverride: true
    },
    brandingPolicy: {
      allowCustomLogo: false,
      lockedLayoutVersion: ""
    },
    lgpdPolicy: {
      requireConsentForExternalShare: false,
      requireDisposalApproval: true,
      retentionReviewWindowDays: 30
    }
  };
}

function normalizeOrganizationComplianceSettings(input: unknown): OrganizationComplianceSettings {
  const defaults = defaultOrganizationComplianceSettings();
  const settings = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const documentSharePolicy =
    settings.documentSharePolicy && typeof settings.documentSharePolicy === "object"
      ? (settings.documentSharePolicy as Record<string, unknown>)
      : {};
  const documentPolicyMatrix =
    settings.documentPolicyMatrix && typeof settings.documentPolicyMatrix === "object"
      ? (settings.documentPolicyMatrix as Record<string, unknown>)
      : {};
  const overridePolicy =
    settings.overridePolicy && typeof settings.overridePolicy === "object"
      ? (settings.overridePolicy as Record<string, unknown>)
      : {};
  const brandingPolicy =
    settings.brandingPolicy && typeof settings.brandingPolicy === "object"
      ? (settings.brandingPolicy as Record<string, unknown>)
      : {};
  const lgpdPolicy =
    settings.lgpdPolicy && typeof settings.lgpdPolicy === "object"
      ? (settings.lgpdPolicy as Record<string, unknown>)
      : {};

  return {
    documentSharePolicy: {
      maxUsesDefault:
        typeof documentSharePolicy.maxUsesDefault === "number"
          ? documentSharePolicy.maxUsesDefault
          : defaults.documentSharePolicy.maxUsesDefault,
      expirationHoursDefault:
        typeof documentSharePolicy.expirationHoursDefault === "number"
          ? documentSharePolicy.expirationHoursDefault
          : defaults.documentSharePolicy.expirationHoursDefault,
      allowHighRiskExternalShare:
        typeof documentSharePolicy.allowHighRiskExternalShare === "boolean"
          ? documentSharePolicy.allowHighRiskExternalShare
          : defaults.documentSharePolicy.allowHighRiskExternalShare
    },
    documentPolicyMatrix: {
      prescription: normalizeDocumentPolicyEntry(
        documentPolicyMatrix.prescription,
        defaults.documentPolicyMatrix.prescription
      ),
      "exam-request": normalizeDocumentPolicyEntry(
        documentPolicyMatrix["exam-request"],
        defaults.documentPolicyMatrix["exam-request"]
      ),
      "medical-certificate": normalizeDocumentPolicyEntry(
        documentPolicyMatrix["medical-certificate"],
        defaults.documentPolicyMatrix["medical-certificate"]
      ),
      "free-document": normalizeDocumentPolicyEntry(
        documentPolicyMatrix["free-document"],
        defaults.documentPolicyMatrix["free-document"]
      )
    },
    overridePolicy: {
      minimumReviewerRole:
        overridePolicy.minimumReviewerRole === "admin" ||
        overridePolicy.minimumReviewerRole === "compliance"
          ? overridePolicy.minimumReviewerRole
          : defaults.overridePolicy.minimumReviewerRole,
      requireInstitutionalReviewForHighSeverity:
        typeof overridePolicy.requireInstitutionalReviewForHighSeverity === "boolean"
          ? overridePolicy.requireInstitutionalReviewForHighSeverity
          : defaults.overridePolicy.requireInstitutionalReviewForHighSeverity,
      requireInstitutionalReviewForModerateInteraction:
        typeof overridePolicy.requireInstitutionalReviewForModerateInteraction === "boolean"
          ? overridePolicy.requireInstitutionalReviewForModerateInteraction
          : defaults.overridePolicy.requireInstitutionalReviewForModerateInteraction,
      autoAcknowledgePrivilegedOverride:
        typeof overridePolicy.autoAcknowledgePrivilegedOverride === "boolean"
          ? overridePolicy.autoAcknowledgePrivilegedOverride
          : defaults.overridePolicy.autoAcknowledgePrivilegedOverride
    },
    brandingPolicy: {
      allowCustomLogo:
        typeof brandingPolicy.allowCustomLogo === "boolean"
          ? brandingPolicy.allowCustomLogo
          : defaults.brandingPolicy.allowCustomLogo,
      lockedLayoutVersion:
        typeof brandingPolicy.lockedLayoutVersion === "string"
          ? brandingPolicy.lockedLayoutVersion
          : defaults.brandingPolicy.lockedLayoutVersion
    },
    lgpdPolicy: {
      requireConsentForExternalShare:
        typeof lgpdPolicy.requireConsentForExternalShare === "boolean"
          ? lgpdPolicy.requireConsentForExternalShare
          : defaults.lgpdPolicy.requireConsentForExternalShare,
      requireDisposalApproval:
        typeof lgpdPolicy.requireDisposalApproval === "boolean"
          ? lgpdPolicy.requireDisposalApproval
          : defaults.lgpdPolicy.requireDisposalApproval,
      retentionReviewWindowDays:
        typeof lgpdPolicy.retentionReviewWindowDays === "number"
          ? lgpdPolicy.retentionReviewWindowDays
          : defaults.lgpdPolicy.retentionReviewWindowDays
    }
  };
}

function normalizeDocumentPolicyEntry(
  input: unknown,
  fallback: OrganizationComplianceSettings["documentPolicyMatrix"][ClinicalDocumentType]
) {
  const settings = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  return {
    allowExternalShare:
      typeof settings.allowExternalShare === "boolean"
        ? settings.allowExternalShare
        : fallback.allowExternalShare,
    requireRqe:
      typeof settings.requireRqe === "boolean" ? settings.requireRqe : fallback.requireRqe,
    minimumShareRole:
      settings.minimumShareRole === "admin" ||
      settings.minimumShareRole === "compliance" ||
      settings.minimumShareRole === "professional"
        ? settings.minimumShareRole
        : fallback.minimumShareRole,
    requirePatientConsentForExternalShare:
      typeof settings.requirePatientConsentForExternalShare === "boolean"
        ? settings.requirePatientConsentForExternalShare
        : fallback.requirePatientConsentForExternalShare,
    shareLinkTtlHours:
      typeof settings.shareLinkTtlHours === "number"
        ? settings.shareLinkTtlHours
        : fallback.shareLinkTtlHours,
    shareLinkMaxUses:
      typeof settings.shareLinkMaxUses === "number"
        ? settings.shareLinkMaxUses
        : fallback.shareLinkMaxUses
  };
}

function hasMinimumRole(
  roles: string[],
  minimumRole: DocumentCompliancePolicy["minimumShareRole"]
) {
  const rank = {
    professional: 1,
    admin: 2,
    compliance: 3
  } as const;
  const currentLevel = Math.max(
    ...roles.map((role) =>
      role === "compliance" ? rank.compliance : role === "admin" ? rank.admin : rank.professional
    ),
    0
  );

  return currentLevel >= rank[minimumRole];
}

function toConsentType(
  value: "external_document_share" | "communication" | "analytics" | "optional_services"
) {
  switch (value) {
    case "external_document_share":
      return "EXTERNAL_DOCUMENT_SHARE" as const;
    case "communication":
      return "COMMUNICATION" as const;
    case "analytics":
      return "ANALYTICS" as const;
    case "optional_services":
      return "OPTIONAL_SERVICES" as const;
  }
}

function mapConsentRecord(consent: {
  id: string;
  patientId: string;
  organizationId: string | null;
  professionalId: string;
  consentType: string;
  status: string;
  purpose: string;
  legalBasis: string;
  grantedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: consent.id,
    patientId: consent.patientId,
    organizationId: consent.organizationId ?? undefined,
    professionalId: consent.professionalId,
    consentType: consent.consentType.toLowerCase(),
    status: consent.status.toLowerCase(),
    purpose: consent.purpose,
    legalBasis: consent.legalBasis,
    grantedAt: consent.grantedAt.toISOString(),
    expiresAt: consent.expiresAt?.toISOString(),
    revokedAt: consent.revokedAt?.toISOString(),
    metadata: consent.metadata,
    createdAt: consent.createdAt.toISOString(),
    updatedAt: consent.updatedAt.toISOString()
  };
}

function toRetentionReviewStatus(value: "pending" | "approved" | "rejected" | "executed") {
  switch (value) {
    case "pending":
      return RetentionReviewStatus.PENDING;
    case "approved":
      return RetentionReviewStatus.APPROVED;
    case "rejected":
      return RetentionReviewStatus.REJECTED;
    case "executed":
      return RetentionReviewStatus.EXECUTED;
  }
}

function mapRetentionReview(review: {
  id: string;
  documentId: string;
  organizationId: string | null;
  documentType: DocumentType;
  retentionCategory: string;
  reviewType: RetentionReviewType;
  status: RetentionReviewStatus;
  dueAt: Date;
  rationale: string | null;
  requestedByUserId: string | null;
  resolvedByUserId: string | null;
  resolutionNotes: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: review.id,
    documentId: review.documentId,
    organizationId: review.organizationId ?? undefined,
    documentType: prismaTypeToDomain[review.documentType],
    retentionCategory: review.retentionCategory,
    reviewType: review.reviewType.toLowerCase(),
    status: review.status.toLowerCase(),
    dueAt: review.dueAt.toISOString(),
    rationale: review.rationale,
    requestedByUserId: review.requestedByUserId,
    resolvedByUserId: review.resolvedByUserId,
    resolutionNotes: review.resolutionNotes,
    resolvedAt: review.resolvedAt?.toISOString(),
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  };
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
