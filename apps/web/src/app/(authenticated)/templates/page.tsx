"use client";

import { ApiClient, type TemplateSummary } from "@receituario/api-client";
import { useEffect, useMemo, useState } from "react";

import { PageSection } from "../../../components/page-section";
import { Shell } from "../../../components/shell";
import { getBrowserApiBaseUrl } from "../../../lib/browser-api";

type TemplateType = "prescription" | "exam-request" | "medical-certificate" | "free-document";

type TemplatePreset = {
  id: string;
  name: string;
  type: TemplateType;
  summary: string;
  structure: Record<string, unknown>;
};

type InstitutionalCollection = {
  id: string;
  name: string;
  description: string;
  presets: TemplatePreset[];
};

const standardTemplatePresets: TemplatePreset[] = [
  {
    id: "standard-prescription",
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
    id: "standard-exam-panel",
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
    id: "standard-attendance-certificate",
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
    id: "standard-rest-certificate",
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
    id: "standard-referral",
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
    id: "standard-summary-report",
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

const specialtyTemplatePresets: TemplatePreset[] = [
  {
    id: "specialty-cardiology-report",
    name: "Relatorio cardiologico inicial",
    type: "free-document",
    summary: "Modelo formal para avaliacao cardiovascular e risco global.",
    structure: {
      title: "Relatorio cardiologico",
      body:
        "Paciente em seguimento cardiologico, com avaliacao clinica e estratificacao de risco cardiovascular realizadas nesta data, mantendo necessidade de seguimento especializado e adequacao terapeutica conforme evolucao."
    }
  },
  {
    id: "specialty-endocrine-report",
    name: "Relatorio endocrinologico",
    type: "free-document",
    summary: "Texto-base para seguimento metabolico e hormonal.",
    structure: {
      title: "Relatorio endocrinologico",
      body:
        "Paciente em acompanhamento endocrinologico, com necessidade de seguimento clinico-laboratorial, ajuste terapeutico e monitorizacao metabolica conforme avaliacao medica."
    }
  },
  {
    id: "specialty-clinic-labs",
    name: "Solicitacao laboratorial de clinica medica",
    type: "exam-request",
    summary: "Template inicial para investigacao clinica ambulatorial.",
    structure: {
      title: "Solicitacao de exames - clinica medica",
      requestedExams: ["Hemograma completo", "Glicemia de jejum", "Creatinina", "TSH", "EAS"],
      preparationNotes: "Jejum conforme orientacao especifica de cada exame."
    }
  },
  {
    id: "specialty-flu-certificate",
    name: "Atestado de repouso para sindrome gripal",
    type: "medical-certificate",
    summary: "Modelo breve e objetivo para repouso em quadro agudo.",
    structure: {
      title: "Atestado medico",
      purpose: "Necessidade de afastamento temporario por condicao clinica aguda",
      restDays: 3,
      observations:
        "Paciente avaliado nesta data, com recomendacao de repouso e reavaliacao em caso de persistencia ou agravamento dos sintomas."
    }
  }
];

const legalClinicalTemplatePresets: TemplatePreset[] = [
  {
    id: "legal-audit-report",
    name: "Relatorio para auditoria",
    type: "free-document",
    summary: "Texto mais formal para justificativa assistencial e documental.",
    structure: {
      title: "Relatorio medico para auditoria",
      body:
        "Apresento relatorio medico com sintese clinica objetiva, fundamentos assistenciais, historico resumido e justificativa tecnica para a conduta adotada, nos limites desta avaliacao."
    }
  },
  {
    id: "legal-follow-up-declaration",
    name: "Declaracao de seguimento",
    type: "free-document",
    summary: "Comprovacao formal de seguimento ambulatorial.",
    structure: {
      title: "Declaracao de seguimento medico",
      body:
        "Declaro, para os devidos fins, que o paciente permanece em acompanhamento medico regular, com necessidade de seguimento conforme plano terapeutico em curso."
    }
  },
  {
    id: "legal-clinical-opinion",
    name: "Parecer clinico sucinto",
    type: "free-document",
    summary: "Base para opiniao tecnica breve e objetiva.",
    structure: {
      title: "Parecer clinico",
      body:
        "Em avaliacao clinica nesta data, emito parecer sucinto com base nos achados assistenciais disponiveis, recomendando seguimento e complementariedade conforme necessidade clinica."
    }
  }
];

const institutionalCollections: InstitutionalCollection[] = [
  {
    id: "collection-ambulatory",
    name: "Ambulatorio clinico",
    description: "Conjunto inicial para consulta ambulatorial geral com documentos e exames mais frequentes.",
    presets: [
      standardTemplatePresets[0]!,
      standardTemplatePresets[1]!,
      standardTemplatePresets[2]!,
      standardTemplatePresets[5]!
    ]
  },
  {
    id: "collection-specialty",
    name: "Especialidades e pareceres",
    description: "Colecao com relatorios especializados e textos mais formais.",
    presets: [
      specialtyTemplatePresets[0]!,
      specialtyTemplatePresets[1]!,
      legalClinicalTemplatePresets[0]!,
      legalClinicalTemplatePresets[2]!
    ]
  },
  {
    id: "collection-occupational",
    name: "Atestados e justificativas",
    description: "Base para comparecimento, repouso breve e documentos administrativos.",
    presets: [
      standardTemplatePresets[2]!,
      standardTemplatePresets[3]!,
      specialtyTemplatePresets[3]!,
      legalClinicalTemplatePresets[1]!
    ]
  }
];

const favoriteStorageKey = "receituario-template-favorites";

export default function TemplatesPage() {
  const [api, setApi] = useState<ApiClient | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [favoritePresetIds, setFavoritePresetIds] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [type, setType] = useState<TemplateType>("prescription");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const allPresets = useMemo(
    () => [...standardTemplatePresets, ...specialtyTemplatePresets, ...legalClinicalTemplatePresets],
    []
  );

  const favoritePresets = useMemo(
    () => allPresets.filter((preset) => favoritePresetIds.includes(preset.id)),
    [allPresets, favoritePresetIds]
  );

  useEffect(() => {
    const baseUrl = getBrowserApiBaseUrl();
    const token = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("receituario_access_token="))
      ?.split("=")[1];

    setApi(new ApiClient(baseUrl, token ? decodeURIComponent(token) : undefined));

    const storedFavorites = window.localStorage.getItem(favoriteStorageKey);
    if (storedFavorites) {
      try {
        setFavoritePresetIds(JSON.parse(storedFavorites) as string[]);
      } catch {
        window.localStorage.removeItem(favoriteStorageKey);
      }
    }
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

  function persistFavorites(nextFavorites: string[]) {
    setFavoritePresetIds(nextFavorites);
    window.localStorage.setItem(favoriteStorageKey, JSON.stringify(nextFavorites));
  }

  function toggleFavorite(presetId: string) {
    persistFavorites(
      favoritePresetIds.includes(presetId)
        ? favoritePresetIds.filter((id) => id !== presetId)
        : [...favoritePresetIds, presetId]
    );
  }

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

  async function importCollection(collection: InstitutionalCollection) {
    if (!api) {
      setError("Cliente da API ainda nao inicializado.");
      setMessage(null);
      return;
    }

    try {
      const createdTemplates = await Promise.all(
        collection.presets.map((preset) =>
          api.createTemplate({
            name: preset.name,
            type: preset.type,
            structure: preset.structure
          })
        )
      );

      setTemplates((current) => [...createdTemplates.reverse(), ...current]);
      setMessage(`Colecao ${collection.name} importada com sucesso.`);
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao importar colecao institucional.");
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
          title="Favoritos pessoais"
          description="Seus atalhos locais para os modelos mais usados. Os favoritos ficam salvos no navegador."
        >
          {favoritePresets.length > 0 ? (
            <PresetCardGrid
              presets={favoritePresets}
              favoritePresetIds={favoritePresetIds}
              onCreate={createFromPreset}
              onToggleFavorite={toggleFavorite}
              actionLabel="Criar favorito"
            />
          ) : (
            <div>Nenhum favorito marcado ainda. Use a estrela nos cards abaixo.</div>
          )}
        </PageSection>

        <PageSection
          title="Modelos padronizados"
          description="Atalhos para criar templates baseados em textos e estruturas iniciais mais realistas para uso medico."
        >
          <PresetCardGrid
            presets={standardTemplatePresets}
            favoritePresetIds={favoritePresetIds}
            onCreate={createFromPreset}
            onToggleFavorite={toggleFavorite}
            actionLabel="Criar a partir deste modelo"
          />
        </PageSection>

        <PageSection
          title="Modelos por especialidade"
          description="Pontos de partida mais contextualizados por area de atuacao, mantendo a possibilidade de personalizacao."
        >
          <PresetCardGrid
            presets={specialtyTemplatePresets}
            favoritePresetIds={favoritePresetIds}
            onCreate={createFromPreset}
            onToggleFavorite={toggleFavorite}
            actionLabel="Criar modelo especializado"
          />
        </PageSection>

        <PageSection
          title="Biblioteca juridico-clinica"
          description="Textos mais formais para pareceres, auditoria, declaracoes e relatorios tecnicos."
        >
          <PresetCardGrid
            presets={legalClinicalTemplatePresets}
            favoritePresetIds={favoritePresetIds}
            onCreate={createFromPreset}
            onToggleFavorite={toggleFavorite}
            actionLabel="Criar texto formal"
          />
        </PageSection>

        <PageSection
          title="Importacao institucional"
          description="Importe em lote colecoes de templates para acelerar a padronizacao da operacao."
        >
          <div style={presetGridStyle}>
            {institutionalCollections.map((collection) => (
              <div key={collection.id} style={presetCardStyle}>
                <div style={{ fontWeight: 700 }}>{collection.name}</div>
                <div style={{ color: "var(--muted)" }}>{collection.description}</div>
                <div style={{ color: "var(--muted)" }}>Itens: {collection.presets.length}</div>
                <button type="button" onClick={() => importCollection(collection)} style={secondaryButtonStyle}>
                  Importar colecao
                </button>
              </div>
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

function PresetCardGrid({
  presets,
  favoritePresetIds,
  onCreate,
  onToggleFavorite,
  actionLabel
}: {
  presets: TemplatePreset[];
  favoritePresetIds: string[];
  onCreate: (preset: TemplatePreset) => void;
  onToggleFavorite: (presetId: string) => void;
  actionLabel: string;
}) {
  return (
    <div style={presetGridStyle}>
      {presets.map((preset) => {
        const isFavorite = favoritePresetIds.includes(preset.id);

        return (
          <div key={preset.id} style={presetCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>{preset.name}</div>
              <button type="button" onClick={() => onToggleFavorite(preset.id)} style={favoriteButtonStyle}>
                {isFavorite ? "★" : "☆"}
              </button>
            </div>
            <div style={{ color: "var(--muted)" }}>Tipo: {preset.type}</div>
            <div style={{ color: "var(--muted)" }}>{preset.summary}</div>
            <button type="button" onClick={() => onCreate(preset)} style={secondaryButtonStyle}>
              {actionLabel}
            </button>
          </div>
        );
      })}
    </div>
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

const secondaryButtonStyle = {
  borderRadius: 14,
  border: "1px solid #c9d8ea",
  background: "#ffffff",
  color: "var(--foreground)",
  padding: "12px 16px",
  cursor: "pointer",
  fontWeight: 700
};

const favoriteButtonStyle = {
  border: "1px solid #c9d8ea",
  background: "#ffffff",
  borderRadius: 12,
  width: 40,
  height: 40,
  cursor: "pointer",
  fontSize: 18
};

const presetGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12
};

const presetCardStyle = {
  display: "grid",
  gap: 10,
  textAlign: "left" as const,
  borderRadius: 16,
  border: "1px solid #c9d8ea",
  background: "#f8fbff",
  padding: 16
};
