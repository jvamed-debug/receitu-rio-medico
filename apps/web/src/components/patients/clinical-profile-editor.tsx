"use client";

import { ApiClient, type PatientClinicalProfile } from "@receituario/api-client";
import { useMemo, useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

export function ClinicalProfileEditor({
  patientId,
  initialProfile
}: {
  patientId: string;
  initialProfile?: PatientClinicalProfile;
}) {
  const [summary, setSummary] = useState(initialProfile?.summary ?? "");
  const [allergiesText, setAllergiesText] = useState(formatAllergies(initialProfile));
  const [conditionsText, setConditionsText] = useState(formatConditions(initialProfile));
  const [medicationsText, setMedicationsText] = useState(formatMedications(initialProfile));
  const [carePlanText, setCarePlanText] = useState(formatCarePlan(initialProfile));
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedPreview = useMemo(
    () => ({
      allergies: parseAllergies(allergiesText),
      conditions: parseConditions(conditionsText),
      chronicMedications: parseMedications(medicationsText),
      carePlan: parseCarePlan(carePlanText)
    }),
    [allergiesText, conditionsText, medicationsText, carePlanText]
  );

  async function saveProfile() {
    setSaving(true);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      await api.updatePatientClinicalProfile(patientId, {
        allergies: parsedPreview.allergies,
        conditions: parsedPreview.conditions,
        chronicMedications: parsedPreview.chronicMedications,
        carePlan: parsedPreview.carePlan,
        summary: summary.trim() || undefined,
        reviewedAt: initialProfile?.reviewedAt,
        reviewedByProfessionalId: initialProfile?.reviewedByProfessionalId
      });
      setMessage("Perfil clinico salvo com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao salvar perfil clinico.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      style={{
        background: "white",
        padding: 24,
        borderRadius: 20,
        boxShadow: "0 18px 40px rgba(15, 64, 128, 0.08)",
        display: "grid",
        gap: 16
      }}
    >
      <div>
        <h2 style={{ margin: 0 }}>Perfil clinico estruturado</h2>
        <p style={{ color: "var(--muted)" }}>
          Registre alergias, condicoes, medicamentos em uso e plano de cuidado em um formato mais util para timeline e CDS futuro.
        </p>
      </div>

      <label style={fieldStyle}>
        <span>Resumo clinico</span>
        <textarea
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          rows={4}
          style={textareaStyle}
          placeholder="Sintese clinica atual, pontos de atencao, contexto assistencial e objetivos do seguimento."
        />
      </label>

      <label style={fieldStyle}>
        <span>Alergias</span>
        <textarea
          value={allergiesText}
          onChange={(event) => setAllergiesText(event.target.value)}
          rows={4}
          style={textareaStyle}
          placeholder={"Dipirona | rash | high\nPenicilina | urticaria | moderate"}
        />
        <small style={hintStyle}>Formato: `substancia | reacao | gravidade`.</small>
      </label>

      <label style={fieldStyle}>
        <span>Condicoes e problemas</span>
        <textarea
          value={conditionsText}
          onChange={(event) => setConditionsText(event.target.value)}
          rows={4}
          style={textareaStyle}
          placeholder={"Hipertensao arterial | controlled | acompanhamento regular\nDiabetes tipo 2 | active | em ajuste terapeutico"}
        />
        <small style={hintStyle}>Formato: `condicao | status | observacao`.</small>
      </label>

      <label style={fieldStyle}>
        <span>Medicamentos cronicos</span>
        <textarea
          value={medicationsText}
          onChange={(event) => setMedicationsText(event.target.value)}
          rows={4}
          style={textareaStyle}
          placeholder={"Losartana | 50 mg | 2x ao dia\nMetformina | 850 mg | 8/8h"}
        />
        <small style={hintStyle}>Formato: `medicamento | dose | frequencia`.</small>
      </label>

      <label style={fieldStyle}>
        <span>Plano de cuidado</span>
        <textarea
          value={carePlanText}
          onChange={(event) => setCarePlanText(event.target.value)}
          rows={4}
          style={textareaStyle}
          placeholder={"Retorno em 30 dias | Reavaliar PA e adesao\nSolicitar exames de controle | HbA1c, creatinina e lipidograma"}
        />
        <small style={hintStyle}>Formato: `acao | observacao`.</small>
      </label>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={saveProfile} disabled={saving} style={buttonStyle}>
          {saving ? "Salvando..." : "Salvar perfil clinico"}
        </button>
        {message ? <span style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</span> : null}
      </div>
    </section>
  );
}

function createBrowserApiClient() {
  const baseUrl = getBrowserApiBaseUrl();
  const accessToken = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("receituario_access_token="))
    ?.split("=")[1];

  return new ApiClient(baseUrl, accessToken ? decodeURIComponent(accessToken) : undefined);
}

function formatAllergies(profile?: PatientClinicalProfile) {
  return (profile?.allergies ?? [])
    .map((item) => [item.substance, item.reaction, item.severity].filter(Boolean).join(" | "))
    .join("\n");
}

function formatConditions(profile?: PatientClinicalProfile) {
  return (profile?.conditions ?? [])
    .map((item) => [item.name, item.status, item.notes].filter(Boolean).join(" | "))
    .join("\n");
}

function formatMedications(profile?: PatientClinicalProfile) {
  return (profile?.chronicMedications ?? [])
    .map((item) => [item.name, item.dosage, item.frequency].filter(Boolean).join(" | "))
    .join("\n");
}

function formatCarePlan(profile?: PatientClinicalProfile) {
  return (profile?.carePlan ?? [])
    .map((item) => [item.title, item.notes].filter(Boolean).join(" | "))
    .join("\n");
}

function parseAllergies(value: string): PatientClinicalProfile["allergies"] {
  return splitLines(value)
    .map((line) => {
      const [substance, reaction, severity] = line
        .split("|")
        .map((item) => item.trim());

      if (!substance) {
        return null;
      }

      return {
        substance,
        reaction: reaction || undefined,
        severity: toSeverity(severity)
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function parseConditions(value: string): PatientClinicalProfile["conditions"] {
  return splitLines(value)
    .map((line) => {
      const [name, status, notes] = line.split("|").map((item) => item.trim());

      if (!name) {
        return null;
      }

      return {
        name,
        status: toConditionStatus(status),
        notes: notes || undefined
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function parseMedications(value: string): PatientClinicalProfile["chronicMedications"] {
  return splitLines(value)
    .map((line) => {
      const [name, dosage, frequency] = line
        .split("|")
        .map((item) => item.trim());

      if (!name) {
        return null;
      }

      return {
        name,
        dosage: dosage || undefined,
        frequency: frequency || undefined
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function parseCarePlan(value: string): PatientClinicalProfile["carePlan"] {
  return splitLines(value)
    .map((line) => {
      const [title, notes] = line.split("|").map((item) => item.trim());

      if (!title) {
        return null;
      }

      return {
        title,
        notes: notes || undefined
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

function splitLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function toSeverity(
  value?: string
): PatientClinicalProfile["allergies"][number]["severity"] {
  if (value === "low" || value === "moderate" || value === "high") {
    return value;
  }

  return undefined;
}

function toConditionStatus(
  value?: string
): PatientClinicalProfile["conditions"][number]["status"] {
  if (value === "active" || value === "controlled" || value === "resolved") {
    return value;
  }

  return undefined;
}

const fieldStyle = {
  display: "grid",
  gap: 8
};

const textareaStyle = {
  width: "100%",
  minHeight: 96,
  borderRadius: 14,
  border: "1px solid #d4e1ef",
  padding: "14px 16px",
  fontSize: 15,
  fontFamily: "inherit",
  resize: "vertical" as const
};

const hintStyle = {
  color: "var(--muted)"
};

const buttonStyle = {
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "white",
  padding: "12px 18px",
  cursor: "pointer"
};
