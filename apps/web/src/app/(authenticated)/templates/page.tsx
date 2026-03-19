"use client";

import { ApiClient, type TemplateSummary } from "@receituario/api-client";
import { useEffect, useState } from "react";

import { getBrowserApiBaseUrl } from "../../../lib/browser-api";
import { PageSection } from "../../../components/page-section";
import { Shell } from "../../../components/shell";

type TemplateType = "prescription" | "exam-request" | "medical-certificate" | "free-document";

export default function TemplatesPage() {
  const [api, setApi] = useState<ApiClient | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<TemplateType>("prescription");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const baseUrl = getBrowserApiBaseUrl();
    const token = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("receituario_access_token="))
      ?.split("=")[1];

    setApi(new ApiClient(baseUrl, token ? decodeURIComponent(token) : undefined));
  }, []);

  useEffect(() => {
    if (!api) {
      return;
    }

    let active = true;

    api
      .listTemplates()
      .then((items) => {
        if (active) {
          setTemplates(items);
        }
      })
      .catch((loadError) => {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar templates.");
        }
      });

    return () => {
      active = false;
    };
  }, [api]);

  async function createTemplate() {
    if (!api) {
      setError("Cliente da API ainda nao inicializado.");
      setMessage(null);
      return;
    }

    try {
      const created = await api.createTemplate({
        name,
        type,
        structure: {
          description: `Template base para ${type}`,
          createdFrom: "web-ui"
        }
      });
      setTemplates((current) => [created, ...current]);
      setName("");
      setMessage(`Template ${created.name} criado com sucesso.`);
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao criar template.");
      setMessage(null);
    }
  }

  return (
    <Shell
      title="Biblioteca de templates"
      subtitle="Modelos oficiais, pessoais e organizacionais com versionamento visual e estrutural."
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection title="Novo template" description="Criacao minima de modelo reutilizavel para o MVP.">
          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome do template"
              style={inputStyle}
            />
            <select value={type} onChange={(event) => setType(event.target.value as TemplateType)} style={inputStyle}>
              <option value="prescription">Prescricao</option>
              <option value="exam-request">Solicitacao de exames</option>
              <option value="medical-certificate">Atestado</option>
              <option value="free-document">Documento livre</option>
            </select>
            <button type="button" onClick={createTemplate} style={buttonStyle} disabled={name.trim().length < 3}>
              Criar template
            </button>
            {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
            {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}
          </div>
        </PageSection>
        <PageSection title="Catalogo atual" description="Templates retornados pelo backend e ordenados por tipo e versao.">
          <div style={{ display: "grid", gap: 12 }}>
            {templates.length > 0 ? (
              templates.map((template) => (
                <div
                  key={template.id}
                  style={{
                    border: "1px solid #d8e2dc",
                    borderRadius: 16,
                    padding: 16,
                    background: "#f8fbf9"
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{template.name}</div>
                  <div>Tipo: {template.type}</div>
                  <div>Versao: {template.version}</div>
                  <div>Estrutura base: {JSON.stringify(template.structure)}</div>
                </div>
              ))
            ) : (
              <div>Nenhum template cadastrado ainda.</div>
            )}
          </div>
        </PageSection>
      </div>
    </Shell>
  );
}

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
  padding: "12px 16px",
  cursor: "pointer"
};
