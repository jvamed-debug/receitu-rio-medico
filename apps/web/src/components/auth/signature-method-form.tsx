"use client";

import { ApiClient } from "@receituario/api-client";
import { useState } from "react";

export function SignatureMethodForm({
  initialProvider
}: {
  initialProvider?: string | null;
}) {
  const [provider, setProvider] = useState(initialProvider ?? "ICP_BRASIL_VENDOR");
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
      await api.post("/me/signature-methods", { provider });
      setMessage("Metodo de assinatura validado com sucesso.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao validar assinatura.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
      <label style={fieldStyle}>
        <span>Provedor</span>
        <select value={provider} onChange={(event) => setProvider(event.target.value)} style={inputStyle}>
          <option value="ICP_BRASIL_VENDOR">ICP-Brasil vendor</option>
          <option value="GOVBR_VENDOR">Gov.br vendor</option>
        </select>
      </label>
      {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
      {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}
      <button type="submit" style={buttonStyle} disabled={saving}>
        {saving ? "Validando..." : "Salvar metodo"}
      </button>
    </form>
  );
}

function createBrowserAuthedClient() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:3333";
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
  border: "1px solid #d8e2dc",
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
