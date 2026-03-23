import test from "node:test";
import assert from "node:assert/strict";

import { CdsService } from "./cds.service";

test("detecta alergia e duplicidade terapeutica na prescricao", async () => {
  const service = new CdsService({
    patient: {
      findUnique: async () => ({
        clinicalProfile: {
          allergies: [{ substance: "dipirona" }],
          chronicMedications: [{ name: "losartana" }],
          conditions: [{ name: "Insuficiencia renal cronica", status: "active" }]
        }
      })
    },
    organization: {
      findUnique: async () => null
    }
  } as never);

  const result = await service.analyzePrescription({
    patientId: "patient-1",
    items: [
      {
        medicationName: "Dipirona 1g",
        dosage: "1 comprimido"
      },
      {
        medicationName: "Losartana",
        dosage: "50mg"
      },
      {
        medicationName: "Ibuprofeno",
        dosage: "400mg"
      }
    ]
  });

  assert.equal(result.severity, "high");
  assert.equal(result.alerts.length, 3);
  assert.equal(result.alerts[0]?.category, "allergy");
  assert.equal(result.alerts[1]?.category, "duplicate_therapy");
  assert.equal(result.alerts[2]?.category, "condition");
  assert.equal(result.alerts[2]?.requiresOverrideJustification, true);
});

test("detecta interacao grave e regra por especialidade", async () => {
  const service = new CdsService({
    patient: {
      findUnique: async () => ({
        clinicalProfile: {
          allergies: [],
          chronicMedications: [],
          conditions: []
        }
      })
    },
    organization: {
      findUnique: async () => null
    }
  } as never);

  const result = await service.analyzePrescription({
    patientId: "patient-2",
    context: {
      specialty: "Pediatria"
    },
    items: [
      {
        medicationName: "Warfarina",
        dosage: "5mg"
      },
      {
        medicationName: "Ibuprofeno",
        dosage: "400mg"
      },
      {
        medicationName: "Ciprofloxacino",
        dosage: "500mg"
      }
    ]
  });

  assert.equal(result.severity, "high");
  assert.equal(
    result.alerts.some((alert) => alert.code === "interaction_warfarin_nsaid"),
    true
  );
  assert.equal(
    result.alerts.some(
      (alert) => alert.code === "specialty_pediatrics_restricted_antibiotic"
    ),
    true
  );
});

test("aplica governanca institucional por tenant e papel", async () => {
  const service = new CdsService({
    patient: {
      findUnique: async () => ({
        clinicalProfile: {
          allergies: [],
          chronicMedications: [],
          conditions: []
        }
      })
    },
    organization: {
      findUnique: async () => ({
        settings: {
          overridePolicy: {
            minimumReviewerRole: "admin",
            requireInstitutionalReviewForHighSeverity: true,
            requireInstitutionalReviewForModerateInteraction: true,
            autoAcknowledgePrivilegedOverride: false
          }
        }
      })
    }
  } as never);

  const result = await service.analyzePrescription({
    patientId: "patient-3",
    organizationId: "org-1",
    requesterRoles: ["professional"],
    items: [
      {
        medicationName: "Warfarina",
        dosage: "5mg"
      },
      {
        medicationName: "Ibuprofeno",
        dosage: "400mg"
      }
    ]
  });

  const interaction = result.alerts.find((alert) => alert.code === "interaction_warfarin_nsaid");

  assert.equal(interaction?.source, "institutional_policy");
  assert.equal(interaction?.institutionalReviewRequired, true);
  assert.equal(interaction?.minimumReviewerRole, "admin");
  assert.equal(interaction?.reviewTier, "required");
  assert.equal(interaction?.governanceReason, "high-severity-institutional-policy");
  assert.equal(result.sources?.includes("institutional-governance:v1"), true);
});

test("graduacao institucional moderada respeita politica da organizacao", async () => {
  const service = new CdsService({
    patient: {
      findUnique: async () => ({
        clinicalProfile: {
          allergies: [],
          chronicMedications: [],
          conditions: []
        }
      })
    },
    organization: {
      findUnique: async () => ({
        settings: {
          overridePolicy: {
            minimumReviewerRole: "compliance",
            requireInstitutionalReviewForHighSeverity: true,
            requireInstitutionalReviewForModerateInteraction: false,
            autoAcknowledgePrivilegedOverride: true
          }
        }
      })
    }
  } as never);

  const result = await service.analyzePrescription({
    patientId: "patient-4",
    organizationId: "org-1",
    requesterRoles: ["professional"],
    context: {
      specialty: "Cardiologia"
    },
    items: [
      {
        medicationName: "Ibuprofeno",
        dosage: "400mg"
      }
    ]
  });

  const alert = result.alerts.find((entry) => entry.code === "specialty_cardiology_nsaid_caution");

  assert.equal(alert?.reviewTier, "recommended");
  assert.equal(alert?.institutionalReviewRequired, undefined);
  assert.equal(alert?.governanceReason, "moderate-interaction-review-recommended");
});
