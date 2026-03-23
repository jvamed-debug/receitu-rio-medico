import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { createHash } from "node:crypto";
import { DocumentType, Prisma } from "@prisma/client";
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
  const missingCodes = requiredAlerts
    .map((alert) => alert.code)
    .filter((code) => !acceptedAlertCodes.includes(code));

  if (!justification || missingCodes.length > 0) {
    throw new BadRequestException({
      message: "Prescricao com alerta clinico exige justificativa formal de override",
      requiredAlertCodes: requiredAlerts.map((alert) => alert.code),
      providedAlertCodes: acceptedAlertCodes,
      missingAlertCodes: missingCodes
    });
  }
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
};
