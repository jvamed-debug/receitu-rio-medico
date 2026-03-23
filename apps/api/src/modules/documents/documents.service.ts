import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { CdsOverrideReviewStatus, DocumentType, Prisma } from "@prisma/client";
import type {
  ClinicalDocument,
  ClinicalDocumentType,
  ExamRequestDocument,
  FreeDocument,
  MedicalCertificateDocument,
  PrescriptionDocument
} from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import { CdsService } from "../cds/cds.service";
import { ComplianceService } from "../compliance/compliance.service";
import {
  buildDocumentPayload,
  toDomainDocument,
  toPrismaDocumentStatus,
  toPrismaDocumentType
} from "./documents.mapper";

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly complianceService: ComplianceService,
    private readonly cdsService: CdsService
  ) {}

  async createPrescription(
    input: CreateDocumentInput<
      Omit<
        PrescriptionDocument,
        "id" | "type" | "status" | "createdAt" | "updatedAt" | "layoutVersion"
      >
    >
  ) {
    return this.createDocument("prescription", input);
  }

  async createExamRequest(
    input: CreateDocumentInput<
      Omit<
        ExamRequestDocument,
        "id" | "type" | "status" | "createdAt" | "updatedAt" | "layoutVersion"
      >
    >
  ) {
    return this.createDocument("exam-request", input);
  }

  async createMedicalCertificate(
    input: CreateDocumentInput<
      Omit<
        MedicalCertificateDocument,
        "id" | "type" | "status" | "createdAt" | "updatedAt" | "layoutVersion"
      >
    >
  ) {
    return this.createDocument("medical-certificate", input);
  }

  async createFreeDocument(
    input: CreateDocumentInput<
      Omit<
        FreeDocument,
        "id" | "type" | "status" | "createdAt" | "updatedAt" | "layoutVersion"
      >
    >
  ) {
    return this.createDocument("free-document", input);
  }

  async getById(id: string) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id }
    });
    if (!document) {
      throw new NotFoundException("Documento não encontrado");
    }
    return toDomainDocument(document);
  }

  async getPdfPreview(id: string) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id },
      include: {
        pdfArtifact: true
      }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    const payload = (document.payload as Record<string, unknown> | null) ?? {};

    return {
      documentId: document.id,
      title: document.title,
      documentType: document.type,
      documentStatus: document.status,
      layoutVersion: document.layoutVersion,
      payloadHash: document.payloadHash ?? null,
      issuedAt: document.issuedAt?.toISOString() ?? null,
      previewMode: document.pdfArtifact ? "artifact" : "draft",
      status: document.pdfArtifact ? "artifact_ready" : "preview_ready",
      artifact: document.pdfArtifact
        ? {
            id: document.pdfArtifact.id,
            storageKey: document.pdfArtifact.storageKey,
            sha256: document.pdfArtifact.sha256,
            createdAt: document.pdfArtifact.createdAt.toISOString()
          }
        : null,
      previewUrl: document.pdfArtifact
        ? `/artifacts/${document.pdfArtifact.storageKey}`
        : null,
      sections: buildPreviewSections(document.type, payload)
    };
  }

  async list() {
    return this.listForProfessional();
  }

  async listForProfessional(authorProfessionalId?: string, organizationId?: string) {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        ...(authorProfessionalId ? { authorProfessionalId } : {}),
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      },
      orderBy: {
        createdAt: "desc"
      }
    });
    return documents.map(toDomainDocument);
  }

  async duplicate(id: string) {
    const source = await this.prisma.clinicalDocument.findUnique({
      where: { id }
    });

    if (!source) {
      throw new NotFoundException("Documento não encontrado");
    }

    const duplicated = await this.prisma.clinicalDocument.create({
      data: {
        type: source.type,
        status: toPrismaDocumentStatus("draft"),
        organizationId: source.organizationId,
        patientId: source.patientId,
        authorProfessionalId: source.authorProfessionalId,
        title: source.title,
        payload: source.payload as Prisma.InputJsonValue,
        layoutVersion: source.layoutVersion,
        derivedFromDocumentId: source.id
      }
    });

    return toDomainDocument(duplicated);
  }

  async listByPatient(
    patientId: string,
    authorProfessionalId?: string,
    organizationId?: string
  ): Promise<ClinicalDocument[]> {
    const documents = await this.prisma.clinicalDocument.findMany({
      where: {
        patientId,
        ...(authorProfessionalId ? { authorProfessionalId } : {}),
        ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {})
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return documents.map(toDomainDocument);
  }

  private async createDocument(
    type: ClinicalDocumentType,
    input: Record<string, unknown>
  ) {
    const enrichedInput = await this.enrichDocumentInput(type, input);
    const compliance = this.complianceService.validateDraft(type, enrichedInput);
    const payload = buildDocumentPayload(type, enrichedInput);
    const document = await this.prisma.clinicalDocument.create({
      data: {
        type: toPrismaDocumentType(type),
        status: toPrismaDocumentStatus(compliance.status),
        organizationId:
          typeof enrichedInput.organizationId === "string" && enrichedInput.organizationId.length > 0
            ? enrichedInput.organizationId
            : null,
        patientId: String(enrichedInput.patientId),
        authorProfessionalId: String(enrichedInput.authorProfessionalId),
        title: String(enrichedInput.title),
        payload,
        layoutVersion: "v1",
        payloadHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex")
      }
    });

    await this.maybeCreateCdsOverrideReview(type, document, enrichedInput);

    return toDomainDocument(document);
  }

  private async enrichDocumentInput(
    type: ClinicalDocumentType,
    input: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    if (type !== "prescription") {
      return {
        ...input
      };
    }

    const cdsSummary = await this.cdsService.analyzePrescription({
      patientId: String(input.patientId),
      organizationId:
        typeof input.organizationId === "string" ? input.organizationId : undefined,
      requesterRoles: Array.isArray(input.requesterRoles)
        ? input.requesterRoles.filter((role): role is string => typeof role === "string")
        : undefined,
      context:
        input.context && typeof input.context === "object"
          ? { specialty: String((input.context as Record<string, unknown>).specialty ?? "") }
          : undefined,
      items: Array.isArray(input.items)
        ? (input.items as PrescriptionDocument["items"])
        : []
    });
    const rawCdsOverride =
      input.cdsOverride && typeof input.cdsOverride === "object"
        ? (input.cdsOverride as Record<string, unknown>)
        : undefined;

    ensureCdsOverrideCompliance(cdsSummary, rawCdsOverride);

    const cdsOverride = rawCdsOverride
      ? {
          ...rawCdsOverride,
          createdAt: new Date().toISOString()
        }
      : undefined;

    return {
      ...input,
      cdsSummary,
      cdsOverride
    };
  }

  async listPendingOverrideReviews(input: {
    organizationId?: string;
    professionalId?: string;
    roles: string[];
  }) {
    const canBypass = input.roles.some((role) => role === "admin" || role === "compliance");
    const reviews = await this.prisma.cdsOverrideReview.findMany({
      where: {
        status: {
          in: [CdsOverrideReviewStatus.PENDING, CdsOverrideReviewStatus.ACKNOWLEDGED]
        },
        ...(canBypass
          ? input.organizationId
            ? { organizationId: input.organizationId }
            : {}
          : input.organizationId
            ? { organizationId: input.organizationId }
            : input.professionalId
              ? { requestedByProfessionalId: input.professionalId }
              : { id: "__no_access__" })
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return reviews.map(toOverrideReviewSummary);
  }

  async resolveOverrideReview(input: {
    reviewId: string;
    organizationId?: string;
    professionalId?: string;
    roles: string[];
    reviewedByProfessionalId: string;
    decision: "acknowledged" | "approved" | "rejected";
    resolutionNotes?: string;
  }) {
    const review = await this.prisma.cdsOverrideReview.findUnique({
      where: { id: input.reviewId }
    });

    if (!review) {
      throw new NotFoundException("Revisao de override nao encontrada");
    }

    const canBypass = input.roles.some((role) => role === "admin" || role === "compliance");

    if (!canBypass) {
      if (input.organizationId && review.organizationId) {
        if (input.organizationId !== review.organizationId) {
          throw new NotFoundException("Revisao de override nao encontrada");
        }
      } else if (
        !input.professionalId ||
        review.requestedByProfessionalId !== input.professionalId
      ) {
        throw new NotFoundException("Revisao de override nao encontrada");
      }
    }

    const updated = await this.prisma.cdsOverrideReview.update({
      where: { id: review.id },
      data: {
        status: mapReviewStatus(input.decision),
        reviewedByProfessionalId: input.reviewedByProfessionalId,
        reviewedAt: new Date(),
        resolutionNotes: input.resolutionNotes ?? null
      }
    });

    return toOverrideReviewSummary(updated);
  }

  private async maybeCreateCdsOverrideReview(
    type: ClinicalDocumentType,
    document: { id: string; organizationId: string | null },
    enrichedInput: Record<string, unknown>
  ) {
    if (type !== "prescription") {
      return;
    }

    const cdsSummary = enrichedInput.cdsSummary as ClinicalDocument["cdsSummary"] | undefined;
    const cdsOverride = enrichedInput.cdsOverride as ClinicalDocument["cdsOverride"] | undefined;
    const requiredAlerts =
      cdsSummary?.alerts.filter((alert) => alert.requiresOverrideJustification) ?? [];

    if (!cdsOverride || requiredAlerts.length === 0) {
      return;
    }

    const requesterRoles = Array.isArray(enrichedInput.requesterRoles)
      ? enrichedInput.requesterRoles.filter((role): role is string => typeof role === "string")
      : [];
    const privilegedReviewer = requesterRoles.some(
      (role) => role === "admin" || role === "compliance"
    );
    const reviewRequiredByPolicy = requiredAlerts.some(
      (alert) => alert.institutionalReviewRequired
    );
    const nextStatus =
      privilegedReviewer && reviewRequiredByPolicy
        ? CdsOverrideReviewStatus.ACKNOWLEDGED
        : CdsOverrideReviewStatus.PENDING;

    await this.prisma.cdsOverrideReview.create({
      data: {
        documentId: document.id,
        organizationId:
          typeof enrichedInput.organizationId === "string"
            ? enrichedInput.organizationId
            : document.organizationId,
        requestedByProfessionalId: String(enrichedInput.authorProfessionalId),
        status: nextStatus,
        alertCodes: requiredAlerts.map((alert) => alert.code) as Prisma.InputJsonValue,
        justification: cdsOverride.justification,
        reviewedByProfessionalId: nextStatus === CdsOverrideReviewStatus.ACKNOWLEDGED
          ? String(enrichedInput.authorProfessionalId)
          : null,
        reviewedAt: nextStatus === CdsOverrideReviewStatus.ACKNOWLEDGED ? new Date() : null,
        resolutionNotes:
          nextStatus === CdsOverrideReviewStatus.ACKNOWLEDGED
            ? "Override institucionalmente reconhecido por perfil privilegiado."
            : null
      }
    });
  }
}

function ensureCdsOverrideCompliance(
  cdsSummary: ClinicalDocument["cdsSummary"],
  cdsOverride:
    | {
        justification?: unknown;
        acceptedAlertCodes?: unknown;
      }
    | undefined
) {
  const requiredAlerts =
    cdsSummary?.alerts.filter((alert) => alert.requiresOverrideJustification) ?? [];

  if (requiredAlerts.length === 0) {
    return;
  }

  const justification =
    typeof cdsOverride?.justification === "string" ? cdsOverride.justification.trim() : "";
  const acceptedAlertCodes = Array.isArray(cdsOverride?.acceptedAlertCodes)
    ? cdsOverride.acceptedAlertCodes.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];
  const acceptsAllRequired = acceptedAlertCodes.some(
    (code) => code === "*" || code === "all-required"
  );
  const missingCodes = requiredAlerts
    .map((alert) => alert.code)
    .filter((code) => !acceptsAllRequired && !acceptedAlertCodes.includes(code));

  if (!justification || missingCodes.length > 0) {
    throw new BadRequestException({
      message: "Prescricao com alerta clinico exige justificativa formal de override",
      requiredAlertCodes: requiredAlerts.map((alert) => alert.code),
      providedAlertCodes: acceptedAlertCodes,
      missingAlertCodes: missingCodes
    });
  }
}

function mapReviewStatus(decision: "acknowledged" | "approved" | "rejected") {
  switch (decision) {
    case "acknowledged":
      return CdsOverrideReviewStatus.ACKNOWLEDGED;
    case "approved":
      return CdsOverrideReviewStatus.APPROVED;
    case "rejected":
      return CdsOverrideReviewStatus.REJECTED;
  }
}

function toOverrideReviewSummary(review: {
  id: string;
  documentId: string;
  organizationId: string | null;
  status: CdsOverrideReviewStatus;
  justification: string;
  alertCodes: unknown;
  resolutionNotes: string | null;
  requestedByProfessionalId: string;
  reviewedByProfessionalId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: review.id,
    documentId: review.documentId,
    organizationId: review.organizationId,
    status: review.status.toLowerCase(),
    justification: review.justification,
    alertCodes: Array.isArray(review.alertCodes)
      ? review.alertCodes.filter((item): item is string => typeof item === "string")
      : [],
    resolutionNotes: review.resolutionNotes,
    requestedByProfessionalId: review.requestedByProfessionalId,
    reviewedByProfessionalId: review.reviewedByProfessionalId,
    reviewedAt: review.reviewedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString()
  };
}

function buildPreviewSections(type: DocumentType, payload: Record<string, unknown>) {
  switch (type) {
    case DocumentType.PRESCRIPTION:
      return [
        {
          title: "Itens prescritos",
          lines: (((payload.items as Record<string, unknown>[] | undefined) ?? []).map((item) =>
            [
              String(item.medicationName ?? "Medicamento sem nome"),
              String(item.dosage ?? "dosagem nao informada"),
              item.frequency ? `frequencia: ${String(item.frequency)}` : null,
              item.duration ? `duracao: ${String(item.duration)}` : null
            ]
              .filter(Boolean)
              .join(" | ")
          ))
        }
      ];
    case DocumentType.EXAM_REQUEST:
      return [
        {
          title: "Exames solicitados",
          lines: ((payload.requestedExams as string[] | undefined) ?? []).map(String)
        },
        {
          title: "Preparo",
          lines: payload.preparationNotes ? [String(payload.preparationNotes)] : []
        }
      ];
    case DocumentType.MEDICAL_CERTIFICATE:
      return [
        {
          title: "Finalidade",
          lines: [String(payload.purpose ?? "nao informada")]
        },
        {
          title: "Observacoes",
          lines: payload.observations ? [String(payload.observations)] : []
        }
      ];
    case DocumentType.FREE_DOCUMENT:
    default:
      return [
        {
          title: "Conteudo",
          lines: [String(payload.body ?? "")]
        }
      ];
  }
}

type CreateDocumentInput<T extends Record<string, unknown>> = T & {
  organizationId?: string;
  requesterRoles?: string[];
};
