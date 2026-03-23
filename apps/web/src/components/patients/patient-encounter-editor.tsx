"use client";

import { ApiClient, type PatientEncounter } from "@receituario/api-client";
import { useMemo, useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

const encounterTypes: Array<{
  value: PatientEncounter["type"];
  label: string;
}> = [
  { value: "clinical_note", label: "Nota clinica" },
  { value: "consultation", label: "Consulta" },
  { value: "follow_up", label: "Retorno" },
  { value: "telehealth", label: "Teleconsulta" },
  { value: "triage", label: "Triagem" },
  { value: "procedure", label: "Procedimento" }
];

export function PatientEncounterEditor({
  patientId,
  initialEncounters
}: {
  patientId: string;
  initialEncounters?: PatientEncounter[];
}) {
  const [type, setType] = useState<PatientEncounter["type"]>("clinical_note");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [encounters, setEncounters] = useState(initialEncounters ?? []);

  const sortedEncounters = useMemo(
    () => [...encounters].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    [encounters]
  );

  async function createEncounter() {
    if (!title.trim()) {
      setMessage("Informe um titulo para registrar o encounter.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const created = await api.createPatientEncounter(patientId, {
        type,
        title: title.trim(),
        summary: summary.trim() || undefined,
        notes: notes.trim() || undefined,
        occurredAt: occurredAt || undefined
      });
      setEncounters((current) => [created, ...current]);
      setTitle("");
      setSummary("");
      setNotes("");
      setOccurredAt("");
      setType("clinical_note");
      setMessage("Encounter registrado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar encounter.");
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
        <h2 style={{ margin: 0 }}>Encounters e evolucao clinica</h2>
        <p style={{ color: "var(--muted)" }}>
          Registre consultas, retornos, triagens e notas clinicas em uma timeline mais estruturada.
        </p>
      </div>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Tipo</span>
          <select value={type} onChange={(event) => setType(event.target.value as PatientEncounter["type"])} style={inputStyle}>
            {encounterTypes.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span>Data e hora</span>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={(event) => setOccurredAt(event.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <label style={fieldStyle}>
        <span>Titulo</span>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          style={inputStyle}
          placeholder="Ex.: retorno de hipertensao, triagem inicial, ajuste terapeutico"
        />
      </label>

      <label style={fieldStyle}>
        <span>Resumo</span>
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          style={inputStyle}
          placeholder="Sintese objetiva do encontro clinico."
        />
      </label>

      <label style={fieldStyle}>
        <span>Notas</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          style={textareaStyle}
          placeholder="Condutas, contexto, achados relevantes e proximos passos."
        />
      </label>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={createEncounter} disabled={saving} style={buttonStyle}>
          {saving ? "Salvando..." : "Registrar encounter"}
        </button>
        {message ? <span style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</span> : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {sortedEncounters.length > 0 ? (
          sortedEncounters.map((encounter) => (
            <article
              key={encounter.id}
              style={{
                borderRadius: 16,
                border: "1px solid #d4e1ef",
                padding: 16,
                background: "#f8fbff"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{encounter.title}</strong>
                <span style={{ color: "var(--muted)" }}>
                  {new Date(encounter.occurredAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>
                {encounter.type.replaceAll("_", " ")}
              </div>
              {encounter.summary ? <div style={{ marginTop: 10 }}>{encounter.summary}</div> : null}
              {encounter.notes ? <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{encounter.notes}</div> : null}
            </article>
          ))
        ) : (
          <div style={{ color: "var(--muted)" }}>Nenhum encounter registrado ainda.</div>
        )}
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

const gridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
};

const fieldStyle = {
  display: "grid",
  gap: 8
};

const inputStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #d4e1ef",
  padding: "12px 14px",
  fontSize: 15,
  fontFamily: "inherit"
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 96,
  resize: "vertical" as const
};

const buttonStyle = {
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "white",
  padding: "12px 18px",
  cursor: "pointer"
};
