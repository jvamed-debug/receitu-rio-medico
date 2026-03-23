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
