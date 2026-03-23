import type {
  ClinicalDocument,
  ClinicalDocumentContext,
  ClinicalDecisionSupportSummary,
  ClinicalDocumentStatus,
  ClinicalDocumentType,
  PrescriptionDocument
} from "@receituario/domain";
import {
  DocumentStatus,
  DocumentType,
  Prisma,
  type ClinicalDocument as PrismaClinicalDocument
} from "@prisma/client";

const typeFromDomain: Record<ClinicalDocumentType, DocumentType> = {
  prescription: DocumentType.PRESCRIPTION,
  "exam-request": DocumentType.EXAM_REQUEST,
  "medical-certificate": DocumentType.MEDICAL_CERTIFICATE,
  "free-document": DocumentType.FREE_DOCUMENT
};

const typeToDomain: Record<DocumentType, ClinicalDocumentType> = {
  PRESCRIPTION: "prescription",
  EXAM_REQUEST: "exam-request",
  MEDICAL_CERTIFICATE: "medical-certificate",
  FREE_DOCUMENT: "free-document"
};

const statusFromDomain: Record<ClinicalDocumentStatus, DocumentStatus> = {
  draft: DocumentStatus.DRAFT,
  ready_for_review: DocumentStatus.READY_FOR_REVIEW,
  pending_signature: DocumentStatus.PENDING_SIGNATURE,
  signed: DocumentStatus.SIGNED,
  issued: DocumentStatus.ISSUED,
  delivered: DocumentStatus.DELIVERED,
  archived: DocumentStatus.ARCHIVED
};

const statusToDomain: Record<DocumentStatus, ClinicalDocumentStatus> = {
  DRAFT: "draft",
  READY_FOR_REVIEW: "ready_for_review",
  PENDING_SIGNATURE: "pending_signature",
  SIGNED: "signed",
  ISSUED: "issued",
  DELIVERED: "delivered",
  ARCHIVED: "archived"
};

export function toPrismaDocumentType(type: ClinicalDocumentType) {
  return typeFromDomain[type];
}

export function toPrismaDocumentStatus(status: ClinicalDocumentStatus) {
  return statusFromDomain[status];
}

export function toDomainDocument(document: PrismaClinicalDocument): ClinicalDocument {
  const base = {
    id: document.id,
    type: typeToDomain[document.type],
    status: statusToDomain[document.status],
    patientId: document.patientId,
    authorProfessionalId: document.authorProfessionalId,
    title: document.title,
    layoutVersion: document.layoutVersion,
    payloadHash: document.payloadHash ?? undefined,
    schemaVersion: readSchemaVersion(document.payload),
    context: readClinicalContext(document.payload),
    cdsSummary: readCdsSummary(document.payload),
    issuedAt: document.issuedAt?.toISOString(),
    derivedFromDocumentId: document.derivedFromDocumentId ?? undefined,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };

  const payload = document.payload as Record<string, unknown> | null;

  switch (document.type) {
    case DocumentType.PRESCRIPTION:
      return {
        ...base,
        type: "prescription",
        items: ((payload?.items as PrescriptionDocument["items"] | undefined) ?? []).map((item) => ({
          ...item
        }))
      };
    case DocumentType.EXAM_REQUEST:
      return {
        ...base,
        type: "exam-request",
        requestedExams: (payload?.requestedExams as string[] | undefined) ?? [],
        preparationNotes: payload?.preparationNotes as string | undefined
      };
    case DocumentType.MEDICAL_CERTIFICATE:
      return {
        ...base,
        type: "medical-certificate",
        purpose: String(payload?.purpose ?? ""),
        restDays: payload?.restDays as number | undefined,
        observations: payload?.observations as string | undefined
      };
    case DocumentType.FREE_DOCUMENT:
    default:
      return {
        ...base,
        type: "free-document",
        body: String(payload?.body ?? "")
      };
  }
}

export function buildDocumentPayload(
  type: ClinicalDocumentType,
  input: Record<string, unknown>
): Prisma.InputJsonObject {
  const baseMetadata = {
    _schemaVersion: "2026.03",
    _context: normalizeContext(input.context)
  };

  switch (type) {
    case "prescription":
      return {
        ...baseMetadata,
        _cds: normalizeCdsSummary(input.cdsSummary),
        items: ((input.items as PrescriptionDocument["items"] | undefined) ?? []).map((item) => ({
          id: item.id ?? null,
          medicationName: item.medicationName,
          activeIngredient: item.activeIngredient ?? null,
          dosage: item.dosage,
          route: item.route ?? null,
          frequency: item.frequency ?? null,
          duration: item.duration ?? null,
          quantity: item.quantity ?? null,
          notes: item.notes ?? null
        }))
      };
    case "exam-request":
      return {
        ...baseMetadata,
        requestedExams: ((input.requestedExams as string[] | undefined) ?? []).map(String),
        preparationNotes: (input.preparationNotes as string | undefined) ?? null
      };
    case "medical-certificate":
      return {
        ...baseMetadata,
        purpose: String(input.purpose ?? ""),
        restDays: (input.restDays as number | undefined) ?? null,
        observations: (input.observations as string | undefined) ?? null
      };
    case "free-document":
      return {
        ...baseMetadata,
        body: String(input.body ?? "")
      };
  }
}

function readSchemaVersion(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const value = (payload as { _schemaVersion?: unknown })._schemaVersion;
  return typeof value === "string" ? value : undefined;
}

function readClinicalContext(payload: unknown): ClinicalDocumentContext | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const context = (payload as { _context?: unknown })._context;
  if (!context || typeof context !== "object") {
    return undefined;
  }

  return context as ClinicalDocumentContext;
}

function readCdsSummary(payload: unknown): ClinicalDecisionSupportSummary | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const summary = (payload as { _cds?: unknown })._cds;
  if (!summary || typeof summary !== "object") {
    return undefined;
  }

  return summary as ClinicalDecisionSupportSummary;
}

function normalizeContext(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
}

function normalizeCdsSummary(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
}
