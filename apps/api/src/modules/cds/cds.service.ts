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
    context?: {
      specialty?: string;
    };
    organizationId?: string;
    requesterRoles?: string[];
  }): Promise<ClinicalDecisionSupportSummary> {
    const [patient, organization] = await Promise.all([
      this.prisma.patient.findUnique({
        where: { id: input.patientId },
        include: {
          clinicalProfile: true
        }
      }),
      input.organizationId
        ? this.prisma.organization.findUnique({
            where: { id: input.organizationId },
            select: { settings: true }
          })
        : Promise.resolve(null)
    ]);

    const profile = mapPatientClinicalProfile(patient?.clinicalProfile);
    const organizationSettings = normalizeCdsOrganizationSettings(organization?.settings);
    const alerts = applyInstitutionalGovernance(
      [
        ...buildAllergyAlerts(profile, input.items),
        ...buildDuplicateTherapyAlerts(profile, input.items),
        ...buildConditionAlerts(profile, input.items),
        ...buildMedicationInteractionAlerts(input.items),
        ...buildSpecialtyAlerts(input.items, input.context?.specialty)
      ],
      {
        organizationId: input.organizationId,
        requesterRoles: input.requesterRoles,
        settings: organizationSettings
      }
    );
    const sources = new Set<string>([
      "local-rules:v1",
      "clinical-profile:v1",
      "medication-interactions:v1",
      "specialty-guardrails:v1"
    ]);

    if (input.organizationId && alerts.some((alert) => alert.source === "institutional_policy")) {
      sources.add("institutional-governance:v1");
    }

    return {
      severity: resolveSeverity(alerts),
      alerts,
      reviewedAt: new Date().toISOString(),
      sources: [...sources]
    };
  }
}

function mapPatientClinicalProfile(
  profile:
    | {
        allergies: unknown;
        conditions: unknown;
        chronicMedications: unknown;
      }
    | null
    | undefined
): PatientClinicalProfile {
  return {
    allergies: Array.isArray(profile?.allergies)
      ? (profile?.allergies as PatientClinicalProfile["allergies"])
      : [],
    conditions: Array.isArray(profile?.conditions)
      ? (profile?.conditions as PatientClinicalProfile["conditions"])
      : [],
    chronicMedications: Array.isArray(profile?.chronicMedications)
      ? (profile?.chronicMedications as PatientClinicalProfile["chronicMedications"])
      : [],
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
        message: `Alergia registrada com correspondencia para ${item.medicationName}.`,
        source: "local_rule",
        reviewTier: "required"
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
        message: `Possivel duplicidade terapeutica com medicacao cronica registrada: ${duplicate}.`,
        source: "local_rule",
        reviewTier: "recommended"
      }
    ];
  });
}

function buildConditionAlerts(
  profile: PatientClinicalProfile,
  items: PrescriptionItem[]
): ClinicalDecisionSupportAlert[] {
  const activeConditions = profile.conditions
    .filter((condition) => condition.status !== "resolved")
    .map((condition) => ({
      normalizedName: condition.name.toLowerCase(),
      displayName: condition.name
    }));

  const conditionRules = [
    {
      match: ["gravidez", "gestante", "gestacao"],
      medicationMatches: ["isotretinoina", "warfarina", "misoprostol"],
      severity: "high" as const,
      code: "condition_pregnancy_risk",
      requiresOverrideJustification: true,
      message: (medicationName: string, conditionName: string) =>
        `${medicationName} exige revisao clinica em contexto de ${conditionName}.`
    },
    {
      match: ["insuficiencia renal", "doenca renal", "renal cronica"],
      medicationMatches: ["ibuprofeno", "diclofenaco", "cetoprofeno"],
      severity: "moderate" as const,
      code: "condition_renal_risk",
      requiresOverrideJustification: true,
      message: (medicationName: string, conditionName: string) =>
        `${medicationName} pode demandar cautela adicional em pacientes com ${conditionName}.`
    },
    {
      match: ["insuficiencia hepatica", "doenca hepatica", "hepatopatia"],
      medicationMatches: ["paracetamol", "nimesulida"],
      severity: "moderate" as const,
      code: "condition_hepatic_risk",
      requiresOverrideJustification: false,
      message: (medicationName: string, conditionName: string) =>
        `${medicationName} pode demandar revisao de seguranca em contexto de ${conditionName}.`
    }
  ];

  return items.flatMap((item) => {
    const medicationName = item.medicationName.toLowerCase();
    const activeIngredient = item.activeIngredient?.toLowerCase() ?? "";

    return conditionRules.flatMap((rule) => {
      const matchingCondition = activeConditions.find((condition) =>
        rule.match.some((term) => condition.normalizedName.includes(term))
      );

      if (!matchingCondition) {
        return [];
      }

      const medicationMatched = rule.medicationMatches.some(
        (term) => medicationName.includes(term) || activeIngredient.includes(term)
      );

      if (!medicationMatched) {
        return [];
      }

      return [
        {
          code: rule.code,
          severity: rule.severity,
          category: "condition",
          message: rule.message(item.medicationName, matchingCondition.displayName),
          requiresOverrideJustification: rule.requiresOverrideJustification,
          source: "local_rule",
          reviewTier: rule.requiresOverrideJustification ? "required" : "recommended"
        }
      ];
    });
  });
}

function buildMedicationInteractionAlerts(
  items: PrescriptionItem[]
): ClinicalDecisionSupportAlert[] {
  const itemPairs = buildItemPairs(items);
  const interactionRules = [
    {
      code: "interaction_warfarin_nsaid",
      medications: ["warfarina", "ibuprofeno", "diclofenaco", "cetoprofeno", "naproxeno"],
      required: ["warfarina", "ibuprofeno|diclofenaco|cetoprofeno|naproxeno"],
      severity: "high" as const,
      message:
        "Associacao entre anticoagulante oral e AINE pode elevar risco importante de sangramento.",
      requiresOverrideJustification: true
    },
    {
      code: "interaction_serotonergic_tramadol",
      medications: ["sertralina", "fluoxetina", "escitalopram", "tramadol"],
      required: ["sertralina|fluoxetina|escitalopram", "tramadol"],
      severity: "high" as const,
      message:
        "Associacao serotonergica com tramadol demanda revisao devido a risco de eventos adversos graves.",
      requiresOverrideJustification: true
    },
    {
      code: "interaction_nitrate_sildenafil",
      medications: ["sildenafil", "tadalafila", "nitrato", "isosorbida", "nitroglicerina"],
      required: ["sildenafil|tadalafila", "nitrato|isosorbida|nitroglicerina"],
      severity: "high" as const,
      message:
        "Associacao entre nitratos e inibidor de PDE5 pode causar hipotensao importante.",
      requiresOverrideJustification: true
    }
  ];

  return interactionRules.flatMap((rule) => {
    const matchedPair = itemPairs.find((pair) =>
      rule.required.every((group) =>
        group.split("|").some((term) => pair.normalizedNames.some((name) => name.includes(term)))
      )
    );

    if (!matchedPair) {
      return [];
    }

    return [
      {
        code: rule.code,
        severity: rule.severity,
        category: "interaction",
        message: `${rule.message} Itens envolvidos: ${matchedPair.displayNames.join(" + ")}.`,
        requiresOverrideJustification: rule.requiresOverrideJustification,
        source: "local_rule",
        reviewTier: "required"
      }
    ];
  });
}

function buildSpecialtyAlerts(
  items: PrescriptionItem[],
  specialty?: string
): ClinicalDecisionSupportAlert[] {
  const normalizedSpecialty = specialty?.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");

  if (!normalizedSpecialty) {
    return [];
  }

  const rules = [
    {
      matches: ["pediatria", "pediatrica"],
      itemMatches: ["ciprofloxacino", "levofloxacino", "tetraciclina", "doxiciclina"],
      code: "specialty_pediatrics_restricted_antibiotic",
      severity: "high" as const,
      requiresOverrideJustification: true,
      message: (medicationName: string) =>
        `${medicationName} exige cautela reforcada em contexto pediatrico e validacao da indicacao.`
    },
    {
      matches: ["geriatria", "clinica medica"],
      itemMatches: ["clonazepam", "diazepam", "alprazolam"],
      code: "specialty_geriatric_sedative",
      severity: "moderate" as const,
      requiresOverrideJustification: true,
      message: (medicationName: string) =>
        `${medicationName} demanda avaliacao de risco de sedacao e quedas em pacientes fragilizados.`
    },
    {
      matches: ["cardiologia"],
      itemMatches: ["diclofenaco", "cetoprofeno", "ibuprofeno"],
      code: "specialty_cardiology_nsaid_caution",
      severity: "moderate" as const,
      requiresOverrideJustification: false,
      message: (medicationName: string) =>
        `${medicationName} merece cautela adicional em seguimento cardiovascular.`
    }
  ];

  return items.flatMap((item) => {
    const medicationName = item.medicationName.toLowerCase();
    const activeIngredient = item.activeIngredient?.toLowerCase() ?? "";

    return rules.flatMap((rule) => {
      if (!rule.matches.some((match) => normalizedSpecialty.includes(match))) {
        return [];
      }

      const medicationMatched = rule.itemMatches.some(
        (term) => medicationName.includes(term) || activeIngredient.includes(term)
      );

      if (!medicationMatched) {
        return [];
      }

      return [
        {
          code: rule.code,
          severity: rule.severity,
          category: "interaction",
          message: rule.message(item.medicationName),
          requiresOverrideJustification: rule.requiresOverrideJustification,
          source: "local_rule",
          reviewTier: rule.requiresOverrideJustification ? "required" : "recommended"
        }
      ];
    });
  });
}

function applyInstitutionalGovernance(
  alerts: ClinicalDecisionSupportAlert[],
  input: {
    organizationId?: string;
    requesterRoles?: string[];
    settings: ReturnType<typeof normalizeCdsOrganizationSettings>;
  }
): ClinicalDecisionSupportAlert[] {
  if (!input.organizationId) {
    return alerts;
  }

  const requesterRoles = input.requesterRoles ?? [];

  return alerts.map((alert) => {
    if (
      alert.severity === "high" &&
      input.settings.requireInstitutionalReviewForHighSeverity
    ) {
      return {
        ...alert,
        source: "institutional_policy" as const,
        requiresOverrideJustification: true,
        institutionalReviewRequired: true,
        minimumReviewerRole: input.settings.minimumReviewerRole,
        reviewTier: "required" as const,
        governanceReason: "high-severity-institutional-policy"
      };
    }

    if (
      alert.severity === "moderate" &&
      alert.category === "interaction" &&
      requesterRoles.includes("professional") &&
      input.settings.requireInstitutionalReviewForModerateInteraction
    ) {
      return {
        ...alert,
        source: "institutional_policy" as const,
        requiresOverrideJustification: true,
        institutionalReviewRequired: true,
        minimumReviewerRole: input.settings.minimumReviewerRole,
        reviewTier: "required" as const,
        governanceReason: "moderate-interaction-institutional-policy"
      };
    }

    if (alert.severity === "moderate") {
      return {
        ...alert,
        reviewTier: alert.reviewTier ?? "recommended",
        governanceReason:
          alert.governanceReason ??
          (alert.category === "interaction"
            ? "moderate-interaction-review-recommended"
            : "moderate-alert-review-recommended")
      };
    }

    return alert;
  });
}

function normalizeCdsOrganizationSettings(input: unknown) {
  const settings =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const override =
    settings.overridePolicy && typeof settings.overridePolicy === "object"
      ? (settings.overridePolicy as Record<string, unknown>)
      : {};

  return {
    minimumReviewerRole:
      override.minimumReviewerRole === "professional" ||
      override.minimumReviewerRole === "admin" ||
      override.minimumReviewerRole === "compliance"
        ? (override.minimumReviewerRole as "professional" | "admin" | "compliance")
        : ("compliance" as const),
    requireInstitutionalReviewForHighSeverity:
      typeof override.requireInstitutionalReviewForHighSeverity === "boolean"
        ? override.requireInstitutionalReviewForHighSeverity
        : true,
    requireInstitutionalReviewForModerateInteraction:
      typeof override.requireInstitutionalReviewForModerateInteraction === "boolean"
        ? override.requireInstitutionalReviewForModerateInteraction
        : true,
    autoAcknowledgePrivilegedOverride:
      typeof override.autoAcknowledgePrivilegedOverride === "boolean"
        ? override.autoAcknowledgePrivilegedOverride
        : true
  };
}

function buildItemPairs(items: PrescriptionItem[]) {
  const normalizedItems = items.map((item) => ({
    displayName: item.medicationName,
    normalizedName: `${item.medicationName} ${item.activeIngredient ?? ""}`.toLowerCase()
  }));
  const pairs: Array<{
    displayNames: [string, string];
    normalizedNames: [string, string];
  }> = [];

  for (let index = 0; index < normalizedItems.length; index += 1) {
    for (let inner = index + 1; inner < normalizedItems.length; inner += 1) {
      pairs.push({
        displayNames: [
          normalizedItems[index]!.displayName,
          normalizedItems[inner]!.displayName
        ],
        normalizedNames: [
          normalizedItems[index]!.normalizedName,
          normalizedItems[inner]!.normalizedName
        ]
      });
    }
  }

  return pairs;
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
