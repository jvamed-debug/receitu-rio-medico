import test from "node:test";
import assert from "node:assert/strict";

import { CdsService } from "./cds.service";

test("detecta alergia e duplicidade terapeutica na prescricao", async () => {
  const service = new CdsService({
    patient: {
      findUnique: async () => ({
        clinicalProfile: {
          allergies: [{ substance: "dipirona" }],
          chronicMedications: [{ name: "losartana" }]
        }
      })
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
      }
    ]
  });

  assert.equal(result.severity, "high");
  assert.equal(result.alerts.length, 2);
  assert.equal(result.alerts[0]?.category, "allergy");
  assert.equal(result.alerts[1]?.category, "duplicate_therapy");
});
