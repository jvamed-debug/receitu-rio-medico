import { Injectable } from "@nestjs/common";
import type {
  ClinicalDecisionSupportAlert,
  ClinicalDecisionSupportSummary,
  PrescriptionItem,
  PatientClinicalProfile
} from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";

@Injectable()
export class CdsService {
  constructor(private readonly prisma: PrismaService) {}

  async analyzePrescription(input: {
    patientId: string;
    items: PrescriptionItem[];
  }): Promise<ClinicalDecisionSupportSummary> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: input.patientId },
      include: {
        clinicalProfile: true
      }
    });

    const profile = mapPatientClinicalProfile(patient?.clinicalProfile);
    const alerts = [
      ...buildAllergyAlerts(profile, input.items),
      ...buildDuplicateTherapyAlerts(profile, input.items)
    ];

    return {
      severity: resolveSeverity(alerts),
      alerts,
      reviewedAt: new Date().toISOString()
    };
  }
}

function mapPatientClinicalProfile(
  profile:
    | {
        allergies: unknown;
        chronicMedications: unknown;
      }
    | null
    | undefined
): PatientClinicalProfile {
  return {
    allergies: Array.isArray(profile?.allergies) ? (profile?.allergies as PatientClinicalProfile["allergies"]) : [],
    chronicMedications: Array.isArray(profile?.chronicMedications)
      ? (profile?.chronicMedications as PatientClinicalProfile["chronicMedications"])
      : [],
    conditions: [],
    carePlan: []
  };
}

function buildAllergyAlerts(
  profile: PatientClinicalProfile,
  items: PrescriptionItem[]
): ClinicalDecisionSupportAlert[] {
  const allergies = profile.allergies.map((item) => item.substance.toLowerCase());

  return items.flatMap((item) => {
    const medicationName = item.medicationName.toLowerCase();
    const activeIngredient = item.activeIngredient?.toLowerCase() ?? "";
    const match = allergies.find(
      (allergy) =>
        medicationName.includes(allergy) || activeIngredient.includes(allergy)
    );

    if (!match) {
      return [];
    }

    return [
      {
        code: "allergy_match",
        severity: "high",
        category: "allergy",
        message: `Alergia registrada com correspondencia para ${item.medicationName}.`
      }
    ];
  });
}

function buildDuplicateTherapyAlerts(
  profile: PatientClinicalProfile,
  items: PrescriptionItem[]
): ClinicalDecisionSupportAlert[] {
  const chronicMedicationNames = profile.chronicMedications.map((item) =>
    item.name.toLowerCase()
  );

  return items.flatMap((item) => {
    const medicationName = item.medicationName.toLowerCase();
    const activeIngredient = item.activeIngredient?.toLowerCase() ?? "";
    const duplicate = chronicMedicationNames.find(
      (current) =>
        medicationName.includes(current) ||
        current.includes(medicationName) ||
        (!!activeIngredient && current.includes(activeIngredient))
    );

    if (!duplicate) {
      return [];
    }

    return [
      {
        code: "duplicate_therapy",
        severity: "moderate",
        category: "duplicate_therapy",
        message: `Possivel duplicidade terapeutica com medicacao cronica registrada: ${duplicate}.`
      }
    ];
  });
}

function resolveSeverity(alerts: ClinicalDecisionSupportAlert[]): ClinicalDecisionSupportSummary["severity"] {
  if (alerts.some((alert) => alert.severity === "high")) {
    return "high";
  }

  if (alerts.some((alert) => alert.severity === "moderate")) {
    return "moderate";
  }

  if (alerts.some((alert) => alert.severity === "low")) {
    return "low";
  }

  return "none";
}
