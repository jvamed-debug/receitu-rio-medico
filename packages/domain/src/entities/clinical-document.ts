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
  payloadVersion: string;
  payloadHash?: string;
  pdfArtifactId?: string;
  schemaVersion: string;
  contractVersion: string;
  context?: ClinicalDocumentContext;
  cdsSummary?: ClinicalDecisionSupportSummary;
  cdsOverride?: ClinicalDecisionSupportOverride;
}

export interface ClinicalDocumentContext {
  encounterType?: "ambulatory" | "telehealth" | "emergency" | "inpatient";
  specialty?: string;
  clinicalReason?: string;
  diagnosisCode?: string;
}

export interface ClinicalDecisionSupportAlert {
  code: string;
  severity: "low" | "moderate" | "high";
  category: "allergy" | "interaction" | "duplicate_therapy" | "condition";
  message: string;
  requiresOverrideJustification?: boolean;
  source?: "local_rule" | "institutional_policy";
  institutionalReviewRequired?: boolean;
  minimumReviewerRole?: "professional" | "admin" | "compliance";
  reviewTier?: "none" | "recommended" | "required";
  governanceReason?: string;
}

export interface ClinicalDecisionSupportSummary {
  severity: "none" | "low" | "moderate" | "high";
  alerts: ClinicalDecisionSupportAlert[];
  reviewedAt: string;
  sources?: string[];
}

export interface ClinicalDecisionSupportOverride {
  justification: string;
  acceptedAlertCodes: string[];
  createdAt?: string;
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
  treatmentIntent?: "acute" | "continuous" | "tapering" | "supportive";
  followUpInstructions?: string;
}

export interface ExamRequestDocument extends ClinicalDocumentBase {
  type: "exam-request";
  requestedExams: string[];
  preparationNotes?: string;
  indication?: string;
  priority?: "routine" | "urgent" | "stat";
}

export interface MedicalCertificateDocument extends ClinicalDocumentBase {
  type: "medical-certificate";
  purpose: string;
  restDays?: number;
  observations?: string;
  certificateKind?: "attendance" | "rest" | "accompaniment" | "fitness";
  workRestrictionNotes?: string;
  fitToReturnDate?: string;
}

export interface FreeDocument extends ClinicalDocumentBase {
  type: "free-document";
  body: string;
  documentKind?: "clinical-report" | "referral" | "declaration" | "opinion";
  audience?: "patient" | "employer" | "insurer" | "specialist" | "general";
  closingStatement?: string;
}

export type ClinicalDocument =
  | PrescriptionDocument
  | ExamRequestDocument
  | MedicalCertificateDocument
  | FreeDocument;
