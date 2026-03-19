"use client";

import { ApiClient } from "@receituario/api-client";
import { useState } from "react";

export function SignatureOperations({
  documentId
}: {
  documentId?: string;
}) {
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [provider, setProvider] = useState("ICP_BRASIL_VENDOR");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openWindow() {
    try {
      const api = createBrowserAuthedClient();
      const result = await api.createSignatureWindow(Number(durationMinutes));
      setMessage(`Janela criada ate ${result.validUntil ?? "agora"}.`);
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar janela.");
      setMessage(null);
    }
  }

  async function signCurrentDocument() {
    if (!documentId) {
      setError("Selecione um documento antes de assinar.");
      return;
    }

    try {
      const api = createBrowserAuthedClient();
      const result = await api.signDocument(documentId, provider);
      setMessage(
        `Documento ${result.documentId} assinado com status ${result.status}. Janela usada: ${result.usedWindow ? "sim" : "nao"}.`
      );
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao assinar documento.");
      setMessage(null);
    }
  }

  return (
    <section
      style={{
        background: "white",
        padding: 24,
        borderRadius: 20,
        boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)",
        display: "grid",
        gap: 16
      }}
    >
      <label style={fieldStyle}>
        <span>Provedor</span>
        <select value={provider} onChange={(event) => setProvider(event.target.value)} style={inputStyle}>
          <option value="ICP_BRASIL_VENDOR">ICP-Brasil vendor</option>
          <option value="GOVBR_VENDOR">Gov.br vendor</option>
        </select>
      </label>
      <label style={fieldStyle}>
        <span>Janela temporaria (minutos)</span>
        <input value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={openWindow} style={primaryButtonStyle}>
          Abrir janela
        </button>
        <button type="button" onClick={signCurrentDocument} style={secondaryButtonStyle}>
          Assinar documento
        </button>
      </div>
      {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
      {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}
    </section>
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

const primaryButtonStyle = {
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "white",
  padding: "12px 16px",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  borderRadius: 14,
  border: "1px solid #d8e2dc",
  background: "white",
  padding: "12px 16px",
  cursor: "pointer"
};
