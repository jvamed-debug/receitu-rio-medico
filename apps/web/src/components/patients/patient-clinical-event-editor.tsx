"use client";

import { ApiClient, type PatientClinicalEvent } from "@receituario/api-client";
import { useMemo, useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

const eventTypes: Array<{
  value: PatientClinicalEvent["eventType"];
  label: string;
}> = [
  { value: "observation", label: "Observacao" },
  { value: "lab_result", label: "Resultado laboratorial" },
  { value: "vital_sign", label: "Sinal vital" },
  { value: "procedure", label: "Procedimento" },
  { value: "incident", label: "Incidente" },
  { value: "communication", label: "Comunicacao" },
  { value: "administrative", label: "Administrativo" }
];

export function PatientClinicalEventEditor({
  patientId,
  initialEvents,
  encounterOptions,
  evolutionOptions
}: {
  patientId: string;
  initialEvents?: PatientClinicalEvent[];
  encounterOptions?: Array<{ id: string; title: string }>;
  evolutionOptions?: Array<{ id: string; title: string }>;
}) {
  const [eventType, setEventType] = useState<PatientClinicalEvent["eventType"]>("observation");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [payloadText, setPayloadText] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [evolutionId, setEvolutionId] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState(initialEvents ?? []);

  const sortedEvents = useMemo(
    () => [...events].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
    [events]
  );

  async function saveEvent() {
    if (!title.trim()) {
      setMessage("Informe o titulo do evento clinico.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const created = await api.createPatientClinicalEvent(patientId, {
        eventType,
        title: title.trim(),
        summary: summary.trim() || undefined,
        payload: parsePayload(payloadText),
        encounterId: encounterId || undefined,
        evolutionId: evolutionId || undefined,
        occurredAt: occurredAt || undefined
      });
      setEvents((current) => [created, ...current]);
      setEventType("observation");
      setTitle("");
      setSummary("");
      setPayloadText("");
      setEncounterId("");
      setEvolutionId("");
      setOccurredAt("");
      setMessage("Evento clinico registrado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao registrar evento clinico.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section style={sectionStyle}>
      <div>
        <h2 style={{ margin: 0 }}>Eventos clinicos estruturados</h2>
        <p style={{ color: "var(--muted)" }}>
          Registre observacoes, resultados, sinais vitais e incidentes com payload estruturado e
          vinculo opcional a encounter ou evolucao.
        </p>
      </div>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Tipo</span>
          <select
            value={eventType}
            onChange={(event) => setEventType(event.target.value as PatientClinicalEvent["eventType"])}
            style={inputStyle}
          >
            {eventTypes.map((option) => (
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
          placeholder="Ex.: PA 150x90 em repouso, lipidograma alterado, ligacao de seguimento"
        />
      </label>

      <div style={gridStyle}>
        <label style={fieldStyle}>
          <span>Encounter vinculado</span>
          <select value={encounterId} onChange={(event) => setEncounterId(event.target.value)} style={inputStyle}>
            <option value="">Sem encounter</option>
            {(encounterOptions ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
        <label style={fieldStyle}>
          <span>Evolucao vinculada</span>
          <select value={evolutionId} onChange={(event) => setEvolutionId(event.target.value)} style={inputStyle}>
            <option value="">Sem evolucao</option>
            {(evolutionOptions ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label style={fieldStyle}>
        <span>Resumo</span>
        <input
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          style={inputStyle}
          placeholder="Sintese interpretativa do evento."
        />
      </label>

      <label style={fieldStyle}>
        <span>Payload estruturado</span>
        <textarea
          value={payloadText}
          onChange={(event) => setPayloadText(event.target.value)}
          rows={5}
          style={textareaStyle}
          placeholder={'{"systolic":150,"diastolic":90,"unit":"mmHg"}'}
        />
      </label>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" onClick={saveEvent} disabled={saving} style={buttonStyle}>
          {saving ? "Salvando..." : "Registrar evento"}
        </button>
        {message ? <span style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</span> : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {sortedEvents.length > 0 ? (
          sortedEvents.map((event) => (
            <article key={event.id} style={cardStyle}>
              <div style={headerRowStyle}>
                <strong>{event.title}</strong>
                <span style={{ color: "var(--muted)" }}>
                  {new Date(event.occurredAt).toLocaleString("pt-BR")}
                </span>
              </div>
              <div style={{ color: "var(--muted)", marginTop: 6 }}>
                {[event.eventType, event.encounterId ? "encounter" : null, event.evolutionId ? "evolucao" : null]
                  .filter(Boolean)
                  .join(" | ")}
              </div>
              {event.summary ? <div style={{ marginTop: 10 }}>{event.summary}</div> : null}
              {event.payload ? (
                <pre
                  style={{
                    marginTop: 10,
                    padding: 12,
                    borderRadius: 12,
                    background: "#eef5fc",
                    overflowX: "auto"
                  }}
                >
                  {JSON.stringify(event.payload, null, 2)}
                </pre>
              ) : null}
            </article>
          ))
        ) : (
          <div style={{ color: "var(--muted)" }}>Nenhum evento clinico registrado ainda.</div>
        )}
      </div>
    </section>
  );
}

function parsePayload(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {
      raw: trimmed
    };
  }

  return {
    raw: trimmed
  };
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
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))"
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
