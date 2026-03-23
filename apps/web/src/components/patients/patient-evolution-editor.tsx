"use client";

import { ApiClient, type PatientEvolution } from "@receituario/api-client";
import { useMemo, useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

export function PatientEvolutionEditor({
  patientId,
  initialEvolutions,
  initialEncounterOptions
}: {
  patientId: string;
  initialEvolutions?: PatientEvolution[];
  initialEncounterOptions?: Array<{ id: string; title: string }>;
}) {
  const [encounterId, setEncounterId] = useState("");
  const [title, setTitle] = useState("");
  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [tags, setTags] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evolutions, setEvolutions] = useState(initialEvolutions ?? []);

  const sortedEvolutions = useMemo(
    () => [...evolutions].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    [evolutions]
  );

  async function saveEvolution() {
    if (!title.trim()) {
      setMessage("Informe um titulo para registrar a evolucao clinica.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const created = await api.createPatientEvolution(patientId, {
        encounterId: encounterId || undefined,
        title: title.trim(),
        subjective: subjective.trim() || undefined,
        objective: objective.trim() || undefined,
        assessment: assessment.trim() || undefined,
        plan: plan.trim() || undefined,
        tags: splitTags(tags),
        occurredAt: occurredAt || undefined
      });
      setEvolutions((current) => [created, ...current]);
      setEncounterId("");
      setTitle("");
      setSubjective("");
      setObjective("");
      setAssessment("");
      setPlan("");
      setTags("");
      setOccurredAt("");
      setMessage("Evolucao clinica registrada com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar evolucao clinica.");
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
        <h2 style={{ margin: 0 }}>Evolucao clinica longitudinal</h2>
        <p style={{ color: "var(--muted)" }}>
          Estruture o seguimento do paciente em formato clinico, ligando a evolucao a um encounter
          quando fizer sentido.
        </p>
      </div>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Encounter vinculado</span>
          <select value={encounterId} onChange={(event) => setEncounterId(event.target.value)} style={inputStyle}>
            <option value="">Sem vinculo direto</option>
            {(initialEncounterOptions ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
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
          placeholder="Ex.: evolucao ambulatorial, reavaliacao pos-procedimento, seguimento clinico"
        />
      </label>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Subjetivo</span>
          <textarea
            value={subjective}
            onChange={(event) => setSubjective(event.target.value)}
            rows={4}
            style={textareaStyle}
            placeholder="Queixas, percepcao do paciente, sintomas relatados."
          />
        </label>
        <label style={fieldStyle}>
          <span>Objetivo</span>
          <textarea
            value={objective}
            onChange={(event) => setObjective(event.target.value)}
            rows={4}
            style={textareaStyle}
            placeholder="Achados de exame fisico, sinais, exames ou dados observados."
          />
        </label>
      </div>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Avaliacao</span>
          <textarea
            value={assessment}
            onChange={(event) => setAssessment(event.target.value)}
            rows={4}
            style={textareaStyle}
            placeholder="Interpretacao clinica, hipoteses, status do caso."
          />
        </label>
        <label style={fieldStyle}>
          <span>Plano</span>
          <textarea
            value={plan}
            onChange={(event) => setPlan(event.target.value)}
            rows={4}
            style={textareaStyle}
            placeholder="Condutas, monitorizacao, exames, retorno e orientacoes."
          />
        </label>
      </div>

      <label style={fieldStyle}>
        <span>Tags clinicas</span>
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          style={inputStyle}
          placeholder="hipertensao, retorno, pos-alta"
        />
      </label>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={saveEvolution} disabled={saving} style={buttonStyle}>
          {saving ? "Salvando..." : "Registrar evolucao"}
        </button>
        {message ? <span style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</span> : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {sortedEvolutions.length > 0 ? (
          sortedEvolutions.map((evolution) => (
            <article
              key={evolution.id}
              style={{
                borderRadius: 16,
                border: "1px solid #d4e1ef",
                padding: 16,
                background: "#f8fbff",
                display: "grid",
                gap: 10
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{evolution.title}</strong>
                <span style={{ color: "var(--muted)" }}>
                  {new Date(evolution.occurredAt).toLocaleString("pt-BR")}
                </span>
              </div>
              {evolution.tags?.length ? (
                <div style={{ color: "var(--muted)" }}>Tags: {evolution.tags.join(", ")}</div>
              ) : null}
              {evolution.subjective ? <StructuredRow label="S" value={evolution.subjective} /> : null}
              {evolution.objective ? <StructuredRow label="O" value={evolution.objective} /> : null}
              {evolution.assessment ? <StructuredRow label="A" value={evolution.assessment} /> : null}
              {evolution.plan ? <StructuredRow label="P" value={evolution.plan} /> : null}
            </article>
          ))
        ) : (
          <div style={{ color: "var(--muted)" }}>Nenhuma evolucao estruturada registrada ainda.</div>
        )}
      </div>
    </section>
  );
}

function StructuredRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{label}: </strong>
      <span style={{ whiteSpace: "pre-wrap" }}>{value}</span>
    </div>
  );
}

function splitTags(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
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
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
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
  minHeight: 110,
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
