"use client";

import { ApiClient } from "@receituario/api-client";
import { useState } from "react";

export function DeliveryPanel({ documentId }: { documentId?: string }) {
  const [selectedDocumentId, setSelectedDocumentId] = useState(documentId ?? "");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<string | null>(null);

  async function sendEmail() {
    if (!selectedDocumentId || !email) {
      setMessage("Informe documento e e-mail para envio.");
      return;
    }

    const api = createBrowserApiClient();
    const result = await api.deliverDocumentByEmail(selectedDocumentId, email);
    setMessage(`Envio registrado com status ${result.status} para ${result.target}.`);
  }

  async function createLink() {
    if (!selectedDocumentId) {
      setMessage("Informe o documento para gerar o link.");
      return;
    }

    const api = createBrowserApiClient();
    const result = await api.createShareLink(selectedDocumentId);
    setShareLink(result.url);
    setMessage("Link seguro gerado com sucesso.");
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
        <span>Documento</span>
        <input value={selectedDocumentId} onChange={(event) => setSelectedDocumentId(event.target.value)} style={inputStyle} />
      </label>
      <label style={fieldStyle}>
        <span>E-mail de entrega</span>
        <input value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} />
      </label>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={sendEmail} style={primaryButtonStyle}>
          Enviar por e-mail
        </button>
        <button type="button" onClick={createLink} style={secondaryButtonStyle}>
          Gerar link seguro
        </button>
      </div>
      {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}
      {shareLink ? (
        <a href={shareLink} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>
          {shareLink}
        </a>
      ) : null}
    </section>
  );
}

function createBrowserApiClient() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.API_BASE_URL ?? "http://localhost:3333";
  return new ApiClient(baseUrl);
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
