export interface Patient {
  id: string;
  fullName: string;
  cpf?: string;
  cns?: string;
  birthDate?: string;
  phone?: string;
  email?: string;
  notes?: string;
  clinicalProfile?: PatientClinicalProfile;
  createdAt: string;
  updatedAt: string;
}

export type PatientEncounterType =
  | "consultation"
  | "follow_up"
  | "telehealth"
  | "triage"
  | "procedure"
  | "clinical_note";

export interface PatientEncounter {
  id: string;
  patientId: string;
  organizationId?: string;
  professionalId: string;
  type: PatientEncounterType;
  title: string;
  summary?: string;
  notes?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PatientTimelineEntry {
  id: string;
  sourceType: "encounter" | "document" | "appointment";
  sourceId: string;
  patientId: string;
  title: string;
  subtitle?: string;
  occurredAt: string;
  status?: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export interface PatientClinicalProfile {
  allergies: PatientAllergy[];
  conditions: PatientCondition[];
  chronicMedications: PatientMedication[];
  carePlan: PatientCarePlanItem[];
  summary?: string;
  reviewedByProfessionalId?: string;
  reviewedAt?: string;
}

export interface PatientAllergy {
  substance: string;
  reaction?: string;
  severity?: "low" | "moderate" | "high";
}

export interface PatientCondition {
  name: string;
  status?: "active" | "controlled" | "resolved";
  notes?: string;
}

export interface PatientMedication {
  name: string;
  dosage?: string;
  frequency?: string;
}

export interface PatientCarePlanItem {
  title: string;
  notes?: string;
}
