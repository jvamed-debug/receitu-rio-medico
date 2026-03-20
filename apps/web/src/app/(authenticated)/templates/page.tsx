"use client";

import { ApiClient, type TemplateSummary } from "@receituario/api-client";
import { useEffect, useMemo, useState } from "react";

import { PageSection } from "../../../components/page-section";
import { Shell } from "../../../components/shell";
import { getBrowserApiBaseUrl } from "../../../lib/browser-api";
import { inferSpecialtyTrack, type SpecialtyTrack } from "../../../lib/clinical-specialty";

type TemplateType = "prescription" | "exam-request" | "medical-certificate" | "free-document";
type TemplateScope = "personal" | "institutional";

type TemplatePreset = {
  id: string;
  name: string;
  type: TemplateType;
  summary: string;
  category: string;
  specialtyTracks?: SpecialtyTrack[];
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
    category: "padrao",
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
    category: "padrao",
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
    category: "padrao",
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
    category: "padrao",
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
    category: "padrao",
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
    category: "padrao",
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
    category: "especialidade",
    specialtyTracks: ["cardiologia"],
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
    category: "especialidade",
    specialtyTracks: ["endocrinologia"],
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
    category: "especialidade",
    specialtyTracks: ["clinica-medica"],
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
    category: "especialidade",
    specialtyTracks: ["clinica-medica", "pediatria"],
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
    category: "juridico-clinico",
    specialtyTracks: ["clinica-medica", "cardiologia", "endocrinologia", "nefrologia", "pediatria", "psiquiatria", "ortopedia"],
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
    category: "juridico-clinico",
    specialtyTracks: ["clinica-medica", "cardiologia", "endocrinologia", "nefrologia", "pediatria", "psiquiatria", "ortopedia"],
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
    category: "juridico-clinico",
    specialtyTracks: ["clinica-medica", "cardiologia", "endocrinologia", "nefrologia", "pediatria", "psiquiatria", "ortopedia"],
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

export default function TemplatesPage() {
  const [api, setApi] = useState<ApiClient | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [favoritePresetIds, setFavoritePresetIds] = useState<string[]>([]);
  const [specialtyTrack, setSpecialtyTrack] = useState<SpecialtyTrack | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<TemplateType>("prescription");
  const [editorName, setEditorName] = useState("");
  const [editorType, setEditorType] = useState<TemplateType>("free-document");
  const [editorScope, setEditorScope] = useState<TemplateScope>("institutional");
  const [editorSummary, setEditorSummary] = useState("");
  const [editorBody, setEditorBody] = useState("");
  const [editorRequestedExams, setEditorRequestedExams] = useState("");
  const [editorPreparationNotes, setEditorPreparationNotes] = useState("");
  const [editorPurpose, setEditorPurpose] = useState("");
  const [editorRestDays, setEditorRestDays] = useState("");
  const [editorObservations, setEditorObservations] = useState("");
  const [editorTags, setEditorTags] = useState("");
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

  const recommendedPresets = useMemo(() => {
    if (!specialtyTrack) {
      return [];
    }

    return allPresets.filter((preset) => preset.specialtyTracks?.includes(specialtyTrack));
  }, [allPresets, specialtyTrack]);

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

    Promise.all([api.listTemplates(), api.listTemplateFavorites(), api.me()])
      .then(([templateItems, favorites, me]) => {
        if (!active) {
          return;
        }

        setTemplates(templateItems);
        setFavoritePresetIds(favorites.map((favorite) => favorite.presetKey));
        setSpecialtyTrack(inferSpecialtyTrack(me.professionalProfile?.specialty));
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
          meta: {
            scope: "personal",
            createdFrom: "web-ui"
          }
        }
      });
      setTemplates((current) => [created, ...current]);
      setName("");
      setMessage(`Template ${created.name} criado com versao ${created.version}.`);
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
        structure: {
          ...preset.structure,
          meta: {
            scope: "personal",
            category: preset.category,
            sourcePresetId: preset.id,
            source: "preset-library"
          }
        }
      });
      setTemplates((current) => [created, ...current]);
      setMessage(`Template ${created.name} criado com versao ${created.version}.`);
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
            structure: {
              ...preset.structure,
              meta: {
                scope: "institutional",
                category: preset.category,
                sourcePresetId: preset.id,
                collectionId: collection.id,
                collectionName: collection.name,
                source: "institutional-import"
              }
            }
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

  async function toggleFavorite(preset: TemplatePreset) {
    if (!api) {
      return;
    }

    try {
      const isFavorite = favoritePresetIds.includes(preset.id);

      if (isFavorite) {
        await api.removeTemplateFavorite(preset.id);
        setFavoritePresetIds((current) => current.filter((id) => id !== preset.id));
      } else {
        await api.saveTemplateFavorite({
          presetKey: preset.id,
          label: preset.name,
          category: preset.category
        });
        setFavoritePresetIds((current) => [...current, preset.id]);
      }

      setError(null);
    } catch (favoriteError) {
      setError(favoriteError instanceof Error ? favoriteError.message : "Falha ao atualizar favoritos.");
      setMessage(null);
    }
  }

  async function createInstitutionalTemplate() {
    if (!api) {
      setError("Cliente da API ainda nao inicializado.");
      setMessage(null);
      return;
    }

    try {
      const structure = buildEditorStructure({
        editorType,
        editorScope,
        editorSummary,
        editorBody,
        editorRequestedExams,
        editorPreparationNotes,
        editorPurpose,
        editorRestDays,
        editorObservations,
        editorTags
      });

      const created = await api.createTemplate({
        name: editorName,
        type: editorType,
        structure
      });

      setTemplates((current) => [created, ...current]);
      setEditorName("");
      setEditorSummary("");
      setEditorBody("");
      setEditorRequestedExams("");
      setEditorPreparationNotes("");
      setEditorPurpose("");
      setEditorRestDays("");
      setEditorObservations("");
      setEditorTags("");
      setMessage(`Template ${created.name} salvo com versao ${created.version}.`);
      setError(null);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao salvar template institucional.");
      setMessage(null);
    }
  }

  return (
    <Shell
      title="Biblioteca de templates"
      subtitle="Modelos oficiais, pessoais e institucionais com favoritos persistidos, recomendacoes por especialidade e versionamento automatico."
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection title="Novo template rapido" description="Criacao minima de modelo pessoal reutilizavel para o MVP.">
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
          title="Editor institucional"
          description="Monte modelos oficiais da clinica com escopo, tags e estrutura padronizada. O backend incrementa a versao automaticamente para nome e tipo iguais."
        >
          <div style={{ display: "grid", gap: 12 }}>
            <input
              value={editorName}
              onChange={(event) => setEditorName(event.target.value)}
              placeholder="Nome do template institucional"
              style={inputStyle}
            />
            <div style={twoColumnGridStyle}>
              <select
                value={editorType}
                onChange={(event) => setEditorType(event.target.value as TemplateType)}
                style={inputStyle}
              >
                <option value="free-document">Documento livre</option>
                <option value="prescription">Prescricao</option>
                <option value="exam-request">Solicitacao de exames</option>
                <option value="medical-certificate">Atestado</option>
              </select>
              <select
                value={editorScope}
                onChange={(event) => setEditorScope(event.target.value as TemplateScope)}
                style={inputStyle}
              >
                <option value="institutional">Institucional</option>
                <option value="personal">Pessoal</option>
              </select>
            </div>
            <input
              value={editorSummary}
              onChange={(event) => setEditorSummary(event.target.value)}
              placeholder="Resumo clinico ou objetivo do modelo"
              style={inputStyle}
            />
            <input
              value={editorTags}
              onChange={(event) => setEditorTags(event.target.value)}
              placeholder="Tags separadas por virgula, ex: clinica, auditoria, admissao"
              style={inputStyle}
            />
            {editorType === "exam-request" ? (
              <>
                <textarea
                  value={editorRequestedExams}
                  onChange={(event) => setEditorRequestedExams(event.target.value)}
                  placeholder="Um exame por linha"
                  style={textAreaStyle}
                />
                <textarea
                  value={editorPreparationNotes}
                  onChange={(event) => setEditorPreparationNotes(event.target.value)}
                  placeholder="Orientacoes de preparo"
                  style={textAreaStyle}
                />
              </>
            ) : null}
            {editorType === "medical-certificate" ? (
              <>
                <input
                  value={editorPurpose}
                  onChange={(event) => setEditorPurpose(event.target.value)}
                  placeholder="Finalidade do atestado"
                  style={inputStyle}
                />
                <div style={twoColumnGridStyle}>
                  <input
                    value={editorRestDays}
                    onChange={(event) => setEditorRestDays(event.target.value)}
                    placeholder="Dias de afastamento"
                    style={inputStyle}
                  />
                  <input
                    value={editorObservations}
                    onChange={(event) => setEditorObservations(event.target.value)}
                    placeholder="Observacoes"
                    style={inputStyle}
                  />
                </div>
              </>
            ) : null}
            {editorType === "prescription" || editorType === "free-document" ? (
              <textarea
                value={editorBody}
                onChange={(event) => setEditorBody(event.target.value)}
                placeholder="Corpo ou orientacoes base do template"
                style={{ ...textAreaStyle, minHeight: 180 }}
              />
            ) : null}
            <button
              type="button"
              onClick={createInstitutionalTemplate}
              style={buttonStyle}
              disabled={editorName.trim().length < 3}
            >
              Salvar no catalogo versionado
            </button>
          </div>
        </PageSection>

        <PageSection
          title="Favoritos pessoais"
          description="Atalhos persistidos no backend para os modelos que voce mais usa."
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
            <div>Nenhum favorito marcado ainda. Use o botao Favoritar nos cards abaixo.</div>
          )}
        </PageSection>

        {recommendedPresets.length > 0 ? (
          <PageSection
            title="Recomendados para sua especialidade"
            description="Sugestoes dinamicas a partir da especialidade salva no onboarding."
          >
            <PresetCardGrid
              presets={recommendedPresets}
              favoritePresetIds={favoritePresetIds}
              onCreate={createFromPreset}
              onToggleFavorite={toggleFavorite}
              actionLabel="Usar recomendado"
            />
          </PageSection>
        ) : null}

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
              templates.map((template) => {
                const structure = template.structure;
                const meta = isRecord(structure.meta) ? structure.meta : {};

                return (
                  <div
                    key={template.id}
                    style={{
                      border: "1px solid #d8e2dc",
                      borderRadius: 16,
                      padding: 16,
                      background: "#f8fbff"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 700 }}>{template.name}</div>
                      <div style={{ color: "var(--muted)" }}>
                        {readString(meta.scope) ?? "personal"} | versao {template.version}
                      </div>
                    </div>
                    <div>Tipo: {template.type}</div>
                    <div>Categoria: {readString(meta.category) ?? "livre"}</div>
                    <div style={{ color: "var(--muted)" }}>
                      Tags: {Array.isArray(meta.tags) ? meta.tags.join(", ") : "sem tags"}
                    </div>
                    <div style={{ color: "var(--muted)", fontSize: 14 }}>
                      Estrutura base: {JSON.stringify(template.structure)}
                    </div>
                  </div>
                );
              })
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
  onToggleFavorite: (preset: TemplatePreset) => void;
  actionLabel: string;
}) {
  return (
    <div style={presetGridStyle}>
      {presets.map((preset) => {
        const isFavorite = favoritePresetIds.includes(preset.id);

        return (
          <div key={preset.id} style={presetCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
              <div style={{ fontWeight: 700 }}>{preset.name}</div>
              <button type="button" onClick={() => onToggleFavorite(preset)} style={favoriteButtonStyle}>
                {isFavorite ? "Desfavoritar" : "Favoritar"}
              </button>
            </div>
            <div style={{ color: "var(--muted)" }}>Tipo: {preset.type}</div>
            <div style={{ color: "var(--muted)" }}>Categoria: {preset.category}</div>
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

function buildEditorStructure(input: {
  editorType: TemplateType;
  editorScope: TemplateScope;
  editorSummary: string;
  editorBody: string;
  editorRequestedExams: string;
  editorPreparationNotes: string;
  editorPurpose: string;
  editorRestDays: string;
  editorObservations: string;
  editorTags: string;
}) {
  const tags = input.editorTags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  const baseMeta = {
    scope: input.editorScope,
    category: "editor",
    editorMode: "institutional",
    summary: input.editorSummary || null,
    tags
  };

  if (input.editorType === "exam-request") {
    return {
      title: "Solicitacao de exames",
      requestedExams: input.editorRequestedExams
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      preparationNotes: input.editorPreparationNotes || null,
      meta: baseMeta
    };
  }

  if (input.editorType === "medical-certificate") {
    return {
      title: "Atestado medico",
      purpose: input.editorPurpose || "Comparecimento em consulta medica",
      restDays: input.editorRestDays ? Number(input.editorRestDays) : null,
      observations: input.editorObservations || null,
      meta: baseMeta
    };
  }

  if (input.editorType === "prescription") {
    return {
      title: "Prescricao medica",
      body: input.editorBody || "Orientacoes padronizadas do template institucional.",
      meta: baseMeta
    };
  }

  return {
    title: "Documento livre",
    body: input.editorBody || "Texto base institucional.",
    meta: baseMeta
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

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
  padding: "10px 12px",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: 700
};

const presetGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12
};

const twoColumnGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
