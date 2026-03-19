"use client";

import type {
  CreateExamRequestInput,
  CreateFreeDocumentInput,
  CreateMedicalCertificateInput,
  CreatePrescriptionInput,
  PatientSummary
} from "@receituario/api-client";
import { ApiClient } from "@receituario/api-client";
import { useEffect, useMemo, useState } from "react";

type FormKind = "prescription" | "exam-request" | "medical-certificate" | "free-document";

type DocumentFormProps =
  | {
      kind: "prescription";
      title: string;
      description: string;
    }
  | {
      kind: "exam-request";
      title: string;
      description: string;
    }
  | {
      kind: "medical-certificate";
      title: string;
      description: string;
    }
  | {
      kind: "free-document";
      title: string;
      description: string;
    };

type FormState = {
  patientId: string;
  title: string;
  medicationName: string;
  activeIngredient: string;
  dosage: string;
  route: string;
  frequency: string;
  duration: string;
  quantity: string;
  notes: string;
  requestedExams: string;
  preparationNotes: string;
  purpose: string;
  restDays: string;
  observations: string;
  body: string;
};

const initialState: FormState = {
  patientId: "",
  title: "",
  medicationName: "",
  activeIngredient: "",
  dosage: "",
  route: "",
  frequency: "",
  duration: "",
  quantity: "",
  notes: "",
  requestedExams: "",
  preparationNotes: "",
  purpose: "",
  restDays: "",
  observations: "",
  body: ""
};

export function DocumentForm({ kind, title, description }: DocumentFormProps) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [state, setState] = useState<FormState>(initialState);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(() => {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:3333";
    return new ApiClient(baseUrl);
  }, []);

  useEffect(() => {
    let active = true;

    api
      .listPatients()
      .then((result) => {
        if (!active) {
          return;
        }

        setPatients(result);
        setState((current) => ({
          ...current,
          patientId: current.patientId || result[0]?.id || ""
        }));
      })
      .catch(() => {
        if (active) {
          setError("Nao foi possivel carregar a lista de pacientes.");
        }
      })
      .finally(() => {
        if (active) {
          setLoadingPatients(false);
        }
      });

    return () => {
      active = false;
    };
  }, [api]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (kind === "prescription") {
        const payload: CreatePrescriptionInput = {
          patientId: state.patientId,
          title: state.title,
          items: [
            {
              medicationName: state.medicationName,
              activeIngredient: state.activeIngredient || undefined,
              dosage: state.dosage,
              route: state.route || undefined,
              frequency: state.frequency || undefined,
              duration: state.duration || undefined,
              quantity: state.quantity || undefined,
              notes: state.notes || undefined
            }
          ]
        };
        await api.createPrescription(payload);
      }

      if (kind === "exam-request") {
        const payload: CreateExamRequestInput = {
          patientId: state.patientId,
          title: state.title,
          requestedExams: state.requestedExams
            .split("\n")
            .map((item) => item.trim())
            .filter(Boolean),
          preparationNotes: state.preparationNotes || undefined
        };
        await api.createExamRequest(payload);
      }

      if (kind === "medical-certificate") {
        const payload: CreateMedicalCertificateInput = {
          patientId: state.patientId,
          title: state.title,
          purpose: state.purpose,
          restDays: state.restDays ? Number(state.restDays) : undefined,
          observations: state.observations || undefined
        };
        await api.createMedicalCertificate(payload);
      }

      if (kind === "free-document") {
        const payload: CreateFreeDocumentInput = {
          patientId: state.patientId,
          title: state.title,
          body: state.body
        };
        await api.createFreeDocument(payload);
      }

      setMessage("Rascunho criado com sucesso na API.");
      setState((current) => ({
        ...initialState,
        patientId: current.patientId
      }));
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao enviar o documento.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      style={{
        background: "white",
        padding: 24,
        borderRadius: 20,
        boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)"
      }}
    >
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <p style={{ color: "var(--muted)" }}>{description}</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16 }}>
        <label style={fieldStyle}>
          <span>Paciente</span>
          <select
            value={state.patientId}
            onChange={(event) => updateField("patientId", event.target.value)}
            style={inputStyle}
            disabled={loadingPatients || submitting}
          >
            <option value="">Selecione um paciente</option>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.fullName}
              </option>
            ))}
          </select>
        </label>

        <label style={fieldStyle}>
          <span>Titulo do documento</span>
          <input
            value={state.title}
            onChange={(event) => updateField("title", event.target.value)}
            style={inputStyle}
            disabled={submitting}
          />
        </label>

        {kind === "prescription" ? (
          <>
            <label style={fieldStyle}>
              <span>Medicamento</span>
              <input value={state.medicationName} onChange={(event) => updateField("medicationName", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Principio ativo</span>
              <input value={state.activeIngredient} onChange={(event) => updateField("activeIngredient", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Dosagem</span>
              <input value={state.dosage} onChange={(event) => updateField("dosage", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Via</span>
              <input value={state.route} onChange={(event) => updateField("route", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Frequencia</span>
              <input value={state.frequency} onChange={(event) => updateField("frequency", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Duracao</span>
              <input value={state.duration} onChange={(event) => updateField("duration", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Quantidade</span>
              <input value={state.quantity} onChange={(event) => updateField("quantity", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Observacoes</span>
              <textarea value={state.notes} onChange={(event) => updateField("notes", event.target.value)} style={textAreaStyle} disabled={submitting} />
            </label>
          </>
        ) : null}

        {kind === "exam-request" ? (
          <>
            <label style={fieldStyle}>
              <span>Exames solicitados</span>
              <textarea
                value={state.requestedExams}
                onChange={(event) => updateField("requestedExams", event.target.value)}
                style={textAreaStyle}
                disabled={submitting}
                placeholder="Um exame por linha"
              />
            </label>
            <label style={fieldStyle}>
              <span>Preparo e observacoes</span>
              <textarea value={state.preparationNotes} onChange={(event) => updateField("preparationNotes", event.target.value)} style={textAreaStyle} disabled={submitting} />
            </label>
          </>
        ) : null}

        {kind === "medical-certificate" ? (
          <>
            <label style={fieldStyle}>
              <span>Finalidade</span>
              <input value={state.purpose} onChange={(event) => updateField("purpose", event.target.value)} style={inputStyle} disabled={submitting} />
            </label>
            <label style={fieldStyle}>
              <span>Dias de afastamento</span>
              <input value={state.restDays} onChange={(event) => updateField("restDays", event.target.value)} style={inputStyle} disabled={submitting} inputMode="numeric" />
            </label>
            <label style={fieldStyle}>
              <span>Observacoes</span>
              <textarea value={state.observations} onChange={(event) => updateField("observations", event.target.value)} style={textAreaStyle} disabled={submitting} />
            </label>
          </>
        ) : null}

        {kind === "free-document" ? (
          <label style={fieldStyle}>
            <span>Corpo do documento</span>
            <textarea value={state.body} onChange={(event) => updateField("body", event.target.value)} style={{ ...textAreaStyle, minHeight: 220 }} disabled={submitting} />
          </label>
        ) : null}

        {error ? (
          <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div>
        ) : null}
        {message ? (
          <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div>
        ) : null}

        <button type="submit" style={submitButtonStyle} disabled={submitting || loadingPatients}>
          {submitting ? "Enviando..." : "Criar rascunho"}
        </button>
      </form>
    </section>
  );

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setState((current) => ({
      ...current,
      [field]: value
    }));
  }
}

const fieldStyle = {
  display: "grid",
  gap: 8,
  fontWeight: 600
};

const inputStyle = {
  borderRadius: 14,
  border: "1px solid #d8e2dc",
  padding: "14px 16px",
  fontSize: 16,
  background: "#fff"
};

const textAreaStyle = {
  ...inputStyle,
  minHeight: 120,
  resize: "vertical" as const
};

const submitButtonStyle = {
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "white",
  padding: "14px 16px",
  fontSize: 16,
  cursor: "pointer"
};
