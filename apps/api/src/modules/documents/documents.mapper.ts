import type {
  ClinicalDocument,
  ClinicalDocumentContext,
  ClinicalDecisionSupportOverride,
  ClinicalDecisionSupportSummary,
  ClinicalDocumentStatus,
  ClinicalDocumentType,
  ExamRequestDocument,
  FreeDocument,
  MedicalCertificateDocument,
  PrescriptionDocument
} from "@receituario/domain";
import {
  DocumentStatus,
  DocumentType,
  Prisma,
  type ClinicalDocument as PrismaClinicalDocument
} from "@prisma/client";

const DOCUMENT_SCHEMA_VERSION = "2026.03";
const DOCUMENT_CONTRACT_VERSION = "document-contract.2026-03";

const payloadVersionByType: Record<ClinicalDocumentType, string> = {
  prescription: "prescription.payload.v2",
  "exam-request": "exam-request.payload.v2",
  "medical-certificate": "medical-certificate.payload.v2",
  "free-document": "free-document.payload.v2"
};

const layoutVersionByType: Record<ClinicalDocumentType, string> = {
  prescription: "prescription.layout.v2",
  "exam-request": "exam-request.layout.v2",
  "medical-certificate": "medical-certificate.layout.v2",
  "free-document": "free-document.layout.v2"
};

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
  const payload = document.payload as Record<string, unknown> | null;
  const content = readDocumentContent(payload);
  const base = {
    id: document.id,
    type: typeToDomain[document.type],
    status: statusToDomain[document.status],
    patientId: document.patientId,
    authorProfessionalId: document.authorProfessionalId,
    title: document.title,
    layoutVersion: document.layoutVersion,
    payloadVersion: readPayloadVersion(payload, typeToDomain[document.type]),
    payloadHash: document.payloadHash ?? undefined,
    schemaVersion: readSchemaVersion(payload),
    contractVersion: readContractVersion(payload),
    context: readClinicalContext(payload),
    cdsSummary: readCdsSummary(payload),
    cdsOverride: readCdsOverride(payload),
    issuedAt: document.issuedAt?.toISOString(),
    derivedFromDocumentId: document.derivedFromDocumentId ?? undefined,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString()
  };

  switch (document.type) {
    case DocumentType.PRESCRIPTION:
      return {
        ...base,
        type: "prescription",
        items: ((content.items as PrescriptionDocument["items"] | undefined) ?? []).map((item) => ({
          ...item
        })),
        treatmentIntent: content.treatmentIntent as PrescriptionDocument["treatmentIntent"] | undefined,
        followUpInstructions: content.followUpInstructions as string | undefined
      };
    case DocumentType.EXAM_REQUEST:
      return {
        ...base,
        type: "exam-request",
        requestedExams: (content.requestedExams as string[] | undefined) ?? [],
        preparationNotes: content.preparationNotes as string | undefined,
        indication: content.indication as string | undefined,
        priority: content.priority as ExamRequestDocument["priority"] | undefined
      };
    case DocumentType.MEDICAL_CERTIFICATE:
      return {
        ...base,
        type: "medical-certificate",
        purpose: String(content.purpose ?? ""),
        restDays: content.restDays as number | undefined,
        observations: content.observations as string | undefined,
        certificateKind:
          content.certificateKind as MedicalCertificateDocument["certificateKind"] | undefined,
        workRestrictionNotes: content.workRestrictionNotes as string | undefined,
        fitToReturnDate: content.fitToReturnDate as string | undefined
      };
    case DocumentType.FREE_DOCUMENT:
    default:
      return {
        ...base,
        type: "free-document",
        body: String(content.body ?? ""),
        documentKind: content.documentKind as FreeDocument["documentKind"] | undefined,
        audience: content.audience as FreeDocument["audience"] | undefined,
        closingStatement: content.closingStatement as string | undefined
      };
  }
}

export function buildDocumentPayload(
  type: ClinicalDocumentType,
  input: Record<string, unknown>
): Prisma.InputJsonObject {
  const baseMetadata = {
    _meta: {
      schemaVersion: DOCUMENT_SCHEMA_VERSION,
      contractVersion: DOCUMENT_CONTRACT_VERSION,
      payloadVersion: payloadVersionByType[type],
      layoutVersion: layoutVersionByType[type],
      type
    },
    _schemaVersion: DOCUMENT_SCHEMA_VERSION,
    _context: normalizeContext(input.context)
  };

  switch (type) {
    case "prescription":
      return {
        ...baseMetadata,
        _cds: normalizeCdsSummary(input.cdsSummary),
        _cdsOverride: normalizeCdsOverride(input.cdsOverride),
        _content: {
          treatmentIntent:
            (input.treatmentIntent as PrescriptionDocument["treatmentIntent"] | undefined) ?? null,
          followUpInstructions: (input.followUpInstructions as string | undefined) ?? null,
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
        }
      };
    case "exam-request":
      return {
        ...baseMetadata,
        _content: {
          requestedExams: ((input.requestedExams as string[] | undefined) ?? []).map(String),
          preparationNotes: (input.preparationNotes as string | undefined) ?? null,
          indication: (input.indication as string | undefined) ?? null,
          priority: (input.priority as ExamRequestDocument["priority"] | undefined) ?? null
        }
      };
    case "medical-certificate":
      return {
        ...baseMetadata,
        _content: {
          purpose: String(input.purpose ?? ""),
          restDays: (input.restDays as number | undefined) ?? null,
          observations: (input.observations as string | undefined) ?? null,
          certificateKind:
            (input.certificateKind as MedicalCertificateDocument["certificateKind"] | undefined) ??
            null,
          workRestrictionNotes: (input.workRestrictionNotes as string | undefined) ?? null,
          fitToReturnDate: (input.fitToReturnDate as string | undefined) ?? null
        }
      };
    case "free-document":
      return {
        ...baseMetadata,
        _content: {
          body: String(input.body ?? ""),
          documentKind: (input.documentKind as FreeDocument["documentKind"] | undefined) ?? null,
          audience: (input.audience as FreeDocument["audience"] | undefined) ?? null,
          closingStatement: (input.closingStatement as string | undefined) ?? null
        }
      };
  }
}

function readSchemaVersion(payload: unknown) {
  const metadata = readPayloadMetadata(payload);
  if (typeof metadata.schemaVersion === "string") {
    return metadata.schemaVersion;
  }

  if (!payload || typeof payload !== "object") {
    return DOCUMENT_SCHEMA_VERSION;
  }

  const value = (payload as { _schemaVersion?: unknown })._schemaVersion;
  return typeof value === "string" ? value : DOCUMENT_SCHEMA_VERSION;
}

function readContractVersion(payload: unknown) {
  const metadata = readPayloadMetadata(payload);
  return typeof metadata.contractVersion === "string"
    ? metadata.contractVersion
    : DOCUMENT_CONTRACT_VERSION;
}

function readPayloadVersion(payload: unknown, type: ClinicalDocumentType) {
  const metadata = readPayloadMetadata(payload);
  return typeof metadata.payloadVersion === "string"
    ? metadata.payloadVersion
    : payloadVersionByType[type];
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

function readCdsOverride(payload: unknown): ClinicalDecisionSupportOverride | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const summary = (payload as { _cdsOverride?: unknown })._cdsOverride;
  if (!summary || typeof summary !== "object") {
    return undefined;
  }

  return summary as ClinicalDecisionSupportOverride;
}

function readPayloadMetadata(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return {};
  }

  const metadata = (payload as { _meta?: unknown })._meta;
  return metadata && typeof metadata === "object"
    ? (metadata as Record<string, unknown>)
    : {};
}

function readDocumentContent(payload: Record<string, unknown> | null) {
  if (!payload) {
    return {};
  }

  const nextContent = payload._content;
  if (nextContent && typeof nextContent === "object") {
    return nextContent as Record<string, unknown>;
  }

  return payload;
}

export function getDocumentLayoutVersion(type: ClinicalDocumentType) {
  return layoutVersionByType[type];
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

function normalizeCdsOverride(input: unknown) {
  if (!input || typeof input !== "object") {
    return null;
  }

  return JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue;
}
