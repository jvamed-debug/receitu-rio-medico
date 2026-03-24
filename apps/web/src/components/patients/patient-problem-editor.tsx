"use client";

import { ApiClient, type PatientProblem } from "@receituario/api-client";
import { useMemo, useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

const problemStatuses: Array<{
  value: PatientProblem["status"];
  label: string;
}> = [
  { value: "active", label: "Ativo" },
  { value: "controlled", label: "Controlado" },
  { value: "resolved", label: "Resolvido" },
  { value: "inactive", label: "Inativo" }
];

export function PatientProblemEditor({
  patientId,
  initialProblems
}: {
  patientId: string;
  initialProblems?: PatientProblem[];
}) {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<PatientProblem["status"]>("active");
  const [severity, setSeverity] = useState("");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [onsetDate, setOnsetDate] = useState("");
  const [resolvedAt, setResolvedAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [problems, setProblems] = useState(initialProblems ?? []);

  const sortedProblems = useMemo(
    () =>
      [...problems].sort((left, right) =>
        (right.onsetDate ?? right.createdAt).localeCompare(left.onsetDate ?? left.createdAt)
      ),
    [problems]
  );

  async function saveProblem() {
    if (!title.trim()) {
      setMessage("Informe o titulo do problema clinico.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const created = await api.createPatientProblem(patientId, {
        title: title.trim(),
        status,
        severity: severity.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: splitTags(tags),
        onsetDate: onsetDate || undefined,
        resolvedAt: resolvedAt || undefined
      });
      setProblems((current) => [created, ...current]);
      setTitle("");
      setStatus("active");
      setSeverity("");
      setNotes("");
      setTags("");
      setOnsetDate("");
      setResolvedAt("");
      setMessage("Problema longitudinal registrado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar problema.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <div>
        <h2 style={{ margin: 0 }}>Problemas e lista ativa</h2>
        <p style={{ color: "var(--muted)" }}>
          Estruture problemas clinicos longitudinalmente, com status, severidade e marco temporal.
        </p>
      </div>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Titulo</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            style={inputStyle}
            placeholder="Ex.: hipertensao arterial sistemica"
          />
        </label>

        <label style={fieldStyle}>
          <span>Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as PatientProblem["status"])}
            style={inputStyle}
          >
            {problemStatuses.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Severidade</span>
          <input
            value={severity}
            onChange={(event) => setSeverity(event.target.value)}
            style={inputStyle}
            placeholder="leve, moderada, alta, instavel"
          />
        </label>

        <label style={fieldStyle}>
          <span>Tags</span>
          <input
            value={tags}
            onChange={(event) => setTags(event.target.value)}
            style={inputStyle}
            placeholder="cronico, risco-cardiovascular, monitorizacao"
          />
        </label>
      </div>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Inicio</span>
          <input
            type="date"
            value={onsetDate}
            onChange={(event) => setOnsetDate(event.target.value)}
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span>Resolucao</span>
          <input
            type="date"
            value={resolvedAt}
            onChange={(event) => setResolvedAt(event.target.value)}
            style={inputStyle}
          />
        </label>
      </div>

      <label style={fieldStyle}>
        <span>Notas</span>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          style={textareaStyle}
          placeholder="Contexto longitudinal, observacoes de seguimento e marcos relevantes."
        />
      </label>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={saveProblem} disabled={saving} style={buttonStyle}>
          {saving ? "Salvando..." : "Registrar problema"}
        </button>
        {message ? <span style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</span> : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {sortedProblems.length > 0 ? (
          sortedProblems.map((problem) => (
            <article key={problem.id} style={cardStyle}>
              <div style={headerRowStyle}>
                <strong>{problem.title}</strong>
                <span style={{ color: "var(--muted)" }}>
                  {problem.onsetDate
                    ? new Date(problem.onsetDate).toLocaleDateString("pt-BR")
                    : new Date(problem.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>
                {[problem.status, problem.severity].filter(Boolean).join(" | ")}
              </div>
              {problem.tags?.length ? (
                <div style={{ marginTop: 8, color: "var(--muted)" }}>
                  Tags: {problem.tags.join(", ")}
                </div>
              ) : null}
              {problem.notes ? <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{problem.notes}</div> : null}
            </article>
          ))
        ) : (
          <div style={{ color: "var(--muted)" }}>Nenhum problema longitudinal registrado ainda.</div>
        )}
      </div>
    </section>
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

const sectionStyle = {
  background: "white",
  padding: 24,
  borderRadius: 20,
  boxShadow: "0 18px 40px rgba(15, 64, 128, 0.08)",
  display: "grid",
  gap: 16
};

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

const cardStyle = {
  borderRadius: 16,
  border: "1px solid #d4e1ef",
  padding: 16,
  background: "#f8fbff"
};

const headerRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap" as const
};
