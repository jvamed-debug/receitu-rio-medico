"use client";

import { ApiClient, type TemplateSummary } from "@receituario/api-client";
import { useEffect, useState } from "react";

import { PageSection } from "../../../components/page-section";
import { Shell } from "../../../components/shell";
import { getBrowserApiBaseUrl } from "../../../lib/browser-api";

type TemplateType = "prescription" | "exam-request" | "medical-certificate" | "free-document";

type TemplatePreset = {
  name: string;
  type: TemplateType;
  summary: string;
  structure: Record<string, unknown>;
};

const templatePresets: TemplatePreset[] = [
  {
    name: "Prescricao padrao ambulatorial",
    type: "prescription",
    summary: "Estrutura base para medicacao de uso habitual com orientacoes gerais.",
    structure: {
      title: "Prescricao medica",
      itemTemplate: {
        dosage: "Conforme orientacao medica",
        frequency: "Conforme posologia prescrita",
        duration: "Uso conforme orientacao",
        notes: "Retornar em caso de piora clinica."
      }
    }
  },
  {
    name: "Painel laboratorial inicial",
    type: "exam-request",
    summary: "Check-up basal com exames metabolicos e hematologicos.",
    structure: {
      title: "Solicitacao de exames laboratoriais",
      requestedExams: [
        "Hemograma completo",
        "Glicemia de jejum",
        "Hemoglobina glicada",
        "Colesterol total e fracoes",
        "Triglicerideos"
      ],
      preparationNotes: "Jejum de 8 horas quando aplicavel."
    }
  },
  {
    name: "Atestado de comparecimento",
    type: "medical-certificate",
    summary: "Texto-base simples para consulta com declaracao de comparecimento.",
    structure: {
      title: "Atestado de comparecimento",
      purpose: "Comparecimento em consulta medica",
      observations: "Paciente esteve em consulta medica nesta data."
    }
  },
  {
    name: "Atestado de repouso breve",
    type: "medical-certificate",
    summary: "Modelo inicial para afastamento de curta duracao.",
    structure: {
      title: "Atestado medico para repouso",
      purpose: "Necessidade de afastamento temporario das atividades habituais",
      restDays: 2,
      observations:
        "Recomenda-se repouso pelo periodo informado e reavaliacao medica em caso de persistencia ou piora."
    }
  },
  {
    name: "Encaminhamento medico",
    type: "free-document",
    summary: "Modelo base para encaminhamento a outra especialidade ou servico.",
    structure: {
      title: "Encaminhamento medico",
      body:
        "Encaminho paciente para avaliacao especializada, com objetivo de complementar investigacao diagnostica e conduta terapeutica."
    }
  },
  {
    name: "Relatorio medico sucinto",
    type: "free-document",
    summary: "Modelo objetivo para continuidade assistencial e pericia.",
    structure: {
      title: "Relatorio medico",
      body:
        "Apresento relatorio medico sucinto, contendo informacoes clinicas pertinentes, historico assistencial resumido e necessidade de seguimento conforme avaliacao realizada nesta data."
    }
  }
];

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

  async function createFromPreset(preset: TemplatePreset) {
    if (!api) {
      setError("Cliente da API ainda nao inicializado.");
      setMessage(null);
      return;
    }

    try {
      const created = await api.createTemplate({
        name: preset.name,
        type: preset.type,
        structure: preset.structure
      });
      setTemplates((current) => [created, ...current]);
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

        <PageSection
          title="Modelos padronizados"
          description="Atalhos para criar templates baseados em textos e estruturas iniciais mais realistas para uso medico."
        >
          <div style={presetGridStyle}>
            {templatePresets.map((preset) => (
              <button key={preset.name} type="button" onClick={() => createFromPreset(preset)} style={presetCardStyle}>
                <div style={{ fontWeight: 700 }}>{preset.name}</div>
                <div style={{ color: "var(--muted)" }}>Tipo: {preset.type}</div>
                <div style={{ color: "var(--muted)" }}>{preset.summary}</div>
                <div style={{ color: "var(--primary)", fontWeight: 700 }}>Criar a partir deste modelo</div>
              </button>
            ))}
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
                    background: "#f8fbff"
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

const presetGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12
};

const presetCardStyle = {
  display: "grid",
  gap: 8,
  textAlign: "left" as const,
  borderRadius: 16,
  border: "1px solid #c9d8ea",
  background: "#f8fbff",
  padding: 16,
  cursor: "pointer"
};
