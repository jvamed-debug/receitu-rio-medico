export type ClinicalDocumentType =
  | "prescription"
  | "exam-request"
  | "medical-certificate"
  | "free-document";

export type ClinicalDocumentStatus =
  | "draft"
  | "ready_for_review"
  | "pending_signature"
  | "signed"
  | "issued"
  | "delivered"
  | "archived";

export interface ClinicalDocumentBase {
  id: string;
  type: ClinicalDocumentType;
  status: ClinicalDocumentStatus;
  patientId: string;
  authorProfessionalId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  issuedAt?: string;
  derivedFromDocumentId?: string;
  layoutVersion: string;
  payloadHash?: string;
  pdfArtifactId?: string;
}

export interface PrescriptionItem {
  id?: string;
  medicationName: string;
  activeIngredient?: string;
  dosage: string;
  route?: string;
  frequency?: string;
  duration?: string;
  quantity?: string;
  notes?: string;
}

export interface PrescriptionDocument extends ClinicalDocumentBase {
  type: "prescription";
  items: PrescriptionItem[];
}

export interface ExamRequestDocument extends ClinicalDocumentBase {
  type: "exam-request";
  requestedExams: string[];
  preparationNotes?: string;
}

export interface MedicalCertificateDocument extends ClinicalDocumentBase {
  type: "medical-certificate";
  purpose: string;
  restDays?: number;
  observations?: string;
}

export interface FreeDocument extends ClinicalDocumentBase {
  type: "free-document";
  body: string;
}

export type ClinicalDocument =
  | PrescriptionDocument
  | ExamRequestDocument
  | MedicalCertificateDocument
  | FreeDocument;
