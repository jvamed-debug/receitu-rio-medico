import type { ClinicalDocument } from "@receituario/domain";

import { DuplicateDocumentButton } from "./duplicate-document-button";

const typeLabels: Record<ClinicalDocument["type"], string> = {
  prescription: "Prescricao",
  "exam-request": "Exame",
  "medical-certificate": "Atestado",
  "free-document": "Documento livre"
};

export function DocumentList({
  title,
  documents
}: {
  title: string;
  documents: ClinicalDocument[];
}) {
  return (
    <section
      style={{
        background: "white",
        padding: 24,
        borderRadius: 20,
        boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)"
      }}
    >
      <h2 style={{ marginTop: 0 }}>{title}</h2>

      {documents.length > 0 ? (
        <div style={{ display: "grid", gap: 14 }}>
          {documents.map((document) => (
            <article
              key={document.id}
              style={{
                padding: 18,
                borderRadius: 18,
                border: "1px solid #d8e2dc",
                background: "#fbfcfb"
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 16
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: "var(--muted)", textTransform: "uppercase" }}>
                    {typeLabels[document.type]} • {document.status}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{document.title}</div>
                  <div style={{ marginTop: 8, color: "var(--muted)" }}>
                    Paciente: {document.patientId} • Criado em{" "}
                    {new Date(document.createdAt).toLocaleString("pt-BR")}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <a href={`/patients/${document.patientId}`} style={linkStyle}>
                    Paciente
                  </a>
                  <a href={`/pdf-preview?documentId=${document.id}`} style={linkStyle}>
                    PDF
                  </a>
                  <a href={`/delivery?documentId=${document.id}`} style={linkStyle}>
                    Envio
                  </a>
                  <DuplicateDocumentButton documentId={document.id} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div style={{ color: "var(--muted)" }}>Nenhum documento encontrado ainda.</div>
      )}
    </section>
  );
}

const linkStyle = {
  display: "inline-block",
  borderRadius: 12,
  background: "var(--primary)",
  color: "white",
  padding: "10px 14px"
};
