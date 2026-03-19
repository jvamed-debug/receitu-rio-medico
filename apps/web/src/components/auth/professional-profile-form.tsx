"use client";

import { ApiClient } from "@receituario/api-client";
import { useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

export function ProfessionalProfileForm({
  initialValues
}: {
  initialValues?: {
    documentNumber?: string | null;
    councilType?: string | null;
    councilState?: string | null;
    rqe?: string | null;
    specialty?: string | null;
    cbo?: string | null;
    cnes?: string | null;
  };
}) {
  const [form, setForm] = useState({
    documentNumber: initialValues?.documentNumber ?? "",
    councilType: initialValues?.councilType ?? "CRM",
    councilState: initialValues?.councilState ?? "SP",
    rqe: initialValues?.rqe ?? "",
    specialty: initialValues?.specialty ?? "Clinica Medica",
    cbo: initialValues?.cbo ?? "",
    cnes: initialValues?.cnes ?? ""
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const api = createBrowserAuthedClient();
      await api.patch("/me/professional-profile", form);
      setMessage("Perfil profissional atualizado.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao atualizar o perfil.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
      <label style={fieldStyle}>
        <span>Numero profissional</span>
        <input value={form.documentNumber} onChange={(event) => update("documentNumber", event.target.value)} style={inputStyle} />
      </label>
      <label style={fieldStyle}>
        <span>Conselho</span>
        <input value={form.councilType} onChange={(event) => update("councilType", event.target.value)} style={inputStyle} />
      </label>
      <label style={fieldStyle}>
        <span>UF do conselho</span>
        <input value={form.councilState} onChange={(event) => update("councilState", event.target.value)} style={inputStyle} />
      </label>
      <label style={fieldStyle}>
        <span>RQE</span>
        <input
          value={form.rqe}
          onChange={(event) => update("rqe", event.target.value)}
          style={inputStyle}
          placeholder="Opcional para especialistas"
        />
      </label>
      <label style={fieldStyle}>
        <span>Especialidade</span>
        <select value={form.specialty} onChange={(event) => update("specialty", event.target.value)} style={inputStyle}>
          {specialties.map((specialty) => (
            <option key={specialty} value={specialty}>
              {specialty}
            </option>
          ))}
        </select>
      </label>
      <label style={fieldStyle}>
        <span>CBO (opcional)</span>
        <input
          value={form.cbo}
          onChange={(event) => update("cbo", event.target.value)}
          style={inputStyle}
          placeholder="Preencha se quiser detalhar a ocupacao"
        />
      </label>
      <label style={fieldStyle}>
        <span>CNES (opcional)</span>
        <input
          value={form.cnes}
          onChange={(event) => update("cnes", event.target.value)}
          style={inputStyle}
          placeholder="Preencha se atuar vinculado a estabelecimento"
        />
      </label>
      {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
      {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}
      <button type="submit" style={buttonStyle} disabled={saving}>
        {saving ? "Salvando..." : "Salvar perfil"}
      </button>
    </form>
  );

  function update(field: keyof typeof form, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  }
}

function createBrowserAuthedClient() {
  const baseUrl = getBrowserApiBaseUrl();
  const token = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("receituario_access_token="))
    ?.split("=")[1];

  return new ApiClient(baseUrl, token ? decodeURIComponent(token) : undefined);
}

const fieldStyle = {
  display: "grid",
  gap: 8,
  fontWeight: 600
};

const inputStyle = {
  borderRadius: 14,
  border: "1px solid #c9d8ea",
  padding: "14px 16px",
  fontSize: 16,
  background: "#fff"
};

const buttonStyle = {
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "white",
  padding: "14px 16px",
  fontSize: 16,
  cursor: "pointer"
};

const specialties = [
  "Clinica Medica",
  "Cardiologia",
  "Pediatria",
  "Ginecologia e Obstetricia",
  "Ortopedia e Traumatologia",
  "Dermatologia",
  "Psiquiatria",
  "Neurologia",
  "Endocrinologia",
  "Medicina de Familia e Comunidade",
  "Oftalmologia",
  "Otorrinolaringologia",
  "Cirurgia Geral",
  "Anestesiologia",
  "Radiologia e Diagnostico por Imagem"
];
