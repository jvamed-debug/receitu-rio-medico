"use client";

import type {
  CreateExamRequestInput,
  CreateFreeDocumentInput,
  CreateMedicalCertificateInput,
  CreatePrescriptionInput,
  PatientSummary
} from "@receituario/api-client";
import { ApiClient } from "@receituario/api-client";
import { useEffect, useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";
import { inferSpecialtyTrack, type SpecialtyTrack } from "../../lib/clinical-specialty";

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
  cdsOverrideJustification: string;
};

type FormPreset = {
  label: string;
  description: string;
  values: Partial<FormState>;
  selectedExams?: string[];
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
  body: "",
  cdsOverrideJustification: ""
};

const defaultValuesByKind: Record<FormKind, Partial<FormState>> = {
  prescription: {
    title: "Prescricao medica",
    frequency: "Conforme orientacao medica",
    duration: "Uso conforme prescricao",
    notes: "Retornar em caso de piora clinica ou efeitos adversos."
  },
  "exam-request": {
    title: "Solicitacao de exames laboratoriais",
    preparationNotes: "Levar documento com foto e seguir orientacoes de jejum quando aplicavel."
  },
  "medical-certificate": {
    title: "Atestado medico",
    purpose: "Comparecimento em consulta medica",
    observations:
      "Paciente esteve em consulta nesta data, devendo manter repouso conforme avaliacao clinica."
  },
  "free-document": {
    title: "Relatorio clinico",
    body:
      "Paciente em acompanhamento clinico regular, com necessidade de seguimento assistencial e reavaliacao conforme evolucao."
  }
};

const labExamGroups = [
  {
    label: "Hematologia e inflamacao",
    description: "Triagem de anemia, infeccao e resposta inflamatoria.",
    exams: ["Hemograma completo", "PCR", "Ferritina", "Ferro serico", "Vitamina B12"]
  },
  {
    label: "Metabolico e lipidico",
    description: "Controle glicemico, dislipidemia e seguimento cronico.",
    exams: [
      "Glicemia de jejum",
      "Hemoglobina glicada",
      "Colesterol total e fracoes",
      "Triglicerideos",
      "Vitamina D"
    ]
  },
  {
    label: "Renal e urinario",
    description: "Avaliacao laboratorial da funcao renal e urinaria.",
    exams: ["Ureia", "Creatinina", "Sodio", "Potassio", "EAS", "Urocultura"]
  },
  {
    label: "Hepatico e digestivo",
    description: "Enzimas hepaticas e investigacao intestinal basica.",
    exams: ["TGO (AST)", "TGP (ALT)", "Gama GT", "Bilirrubinas", "Parasitologico de fezes"]
  },
  {
    label: "Endocrino e coagulacao",
    description: "Triagem tireoidiana e avaliacao hemostatica.",
    exams: ["TSH", "T4 livre", "Coagulograma"]
  }
] as const;

const examPanelPresets: FormPreset[] = [
  {
    label: "Check-up metabolico",
    description: "Painel inicial para triagem clinica e metabolica.",
    values: {
      title: "Solicitacao de check-up metabolico",
      preparationNotes: "Jejum de 8 horas quando aplicavel."
    },
    selectedExams: [
      "Hemograma completo",
      "Glicemia de jejum",
      "Hemoglobina glicada",
      "Colesterol total e fracoes",
      "Triglicerideos",
      "TSH",
      "T4 livre"
    ]
  },
  {
    label: "Funcao renal",
    description: "Painel laboratorial para seguimento renal e urinario.",
    values: {
      title: "Solicitacao de avaliacao de funcao renal"
    },
    selectedExams: ["Ureia", "Creatinina", "Sodio", "Potassio", "EAS", "Urocultura"]
  },
  {
    label: "Perfil hepatico",
    description: "Exames de funcao hepatica e vias biliares.",
    values: {
      title: "Solicitacao de perfil hepatica"
    },
    selectedExams: ["TGO (AST)", "TGP (ALT)", "Gama GT", "Bilirrubinas"]
  },
  {
    label: "Investigacao de anemia",
    description: "Triagem inicial hematimetrica e de ferro.",
    values: {
      title: "Solicitacao para investigacao de anemia"
    },
    selectedExams: ["Hemograma completo", "Ferritina", "Ferro serico", "Vitamina B12"]
  },
  {
    label: "Seguimento do diabetes",
    description: "Controle glicemico, renal e metabolico.",
    values: {
      title: "Solicitacao para seguimento do diabetes mellitus",
      preparationNotes: "Jejum de 8 horas para glicemia e lipidograma."
    },
    selectedExams: [
      "Glicemia de jejum",
      "Hemoglobina glicada",
      "Colesterol total e fracoes",
      "Triglicerideos",
      "Creatinina",
      "EAS"
    ]
  },
  {
    label: "Perfil tireoidiano",
    description: "Investigacao inicial de disfuncao tireoidiana.",
    values: {
      title: "Solicitacao de perfil tireoidiano"
    },
    selectedExams: ["TSH", "T4 livre"]
  },
  {
    label: "Risco inflamatorio",
    description: "Painel basico para suspeita de processo inflamatorio.",
    values: {
      title: "Solicitacao de avaliacao inflamatoria"
    },
    selectedExams: ["Hemograma completo", "PCR", "Ferritina"]
  }
];

const specialtyExamPresets: FormPreset[] = [
  {
    label: "Cardiologia",
    description: "Painel laboratorial de apoio ao risco cardiometabolico.",
    values: {
      title: "Solicitacao de exames - avaliacao cardiometabolica",
      preparationNotes: "Jejum de 8 horas para lipidograma quando aplicavel."
    },
    selectedExams: [
      "Hemograma completo",
      "Glicemia de jejum",
      "Hemoglobina glicada",
      "Colesterol total e fracoes",
      "Triglicerideos",
      "Creatinina",
      "Sodio",
      "Potassio"
    ]
  },
  {
    label: "Endocrinologia",
    description: "Triagem inicial metabolica e tireoidiana.",
    values: {
      title: "Solicitacao de exames - avaliacao endocrinologica",
      preparationNotes: "Jejum de 8 horas para glicemia e lipidograma."
    },
    selectedExams: [
      "Glicemia de jejum",
      "Hemoglobina glicada",
      "TSH",
      "T4 livre",
      "Vitamina D",
      "Vitamina B12",
      "Colesterol total e fracoes",
      "Triglicerideos"
    ]
  },
  {
    label: "Nefrologia",
    description: "Avaliacao funcional renal e urinaria.",
    values: {
      title: "Solicitacao de exames - avaliacao nefrologica"
    },
    selectedExams: ["Ureia", "Creatinina", "Sodio", "Potassio", "EAS", "Urocultura", "Coagulograma"]
  },
  {
    label: "Clinica medica",
    description: "Base ampla para triagem e acompanhamento ambulatorial.",
    values: {
      title: "Solicitacao de exames - avaliacao clinica geral",
      preparationNotes: "Jejum conforme orientacao especifica de cada exame."
    },
    selectedExams: [
      "Hemograma completo",
      "Glicemia de jejum",
      "Creatinina",
      "TGO (AST)",
      "TGP (ALT)",
      "TSH",
      "EAS"
    ]
  }
];

const prescriptionPresets: FormPreset[] = [
  {
    label: "Uso continuo",
    description: "Base para medicacao de manutencao.",
    values: {
      title: "Prescricao de uso continuo",
      frequency: "Uso continuo conforme orientacao medica",
      duration: "Uso continuo",
      notes: "Nao interromper sem reavaliacao medica."
    }
  },
  {
    label: "Tratamento curto",
    description: "Base para uso por poucos dias com retorno se piora.",
    values: {
      title: "Prescricao para tratamento agudo",
      duration: "7 dias",
      notes: "Retornar se persistencia dos sintomas, piora ou evento adverso."
    }
  }
];

const specialtyPrescriptionPresets: FormPreset[] = [
  {
    label: "Cardiologia",
    description: "Base para prescricao ambulatorial cardiovascular.",
    values: {
      title: "Prescricao cardiologica",
      frequency: "Conforme esquema prescrito e monitorizacao clinica",
      duration: "Uso continuo",
      notes: "Orientado retorno para reavaliacao cardiovascular programada."
    }
  },
  {
    label: "Pediatria",
    description: "Texto-base com reforco de reavaliacao e observacao familiar.",
    values: {
      title: "Prescricao pediatrica",
      frequency: "Conforme orientacao medica e faixa etaria",
      notes: "Responsavel orientado a observar sinais de alarme e retornar em caso de piora."
    }
  },
  {
    label: "Clinica medica",
    description: "Modelo amplo para seguimento ambulatorial.",
    values: {
      title: "Prescricao de clinica medica",
      frequency: "Conforme posologia prescrita",
      duration: "Uso conforme orientacao",
      notes: "Retorno ambulatorial conforme evolucao clinica."
    }
  }
];

const medicalCertificatePresets: FormPreset[] = [
  {
    label: "Comparecimento",
    description: "Declara comparecimento em consulta na data.",
    values: {
      title: "Atestado de comparecimento",
      purpose: "Comparecimento em consulta medica",
      restDays: "",
      observations: "Paciente esteve em consulta medica nesta data."
    }
  },
  {
    label: "Repouso breve",
    description: "Texto-base para afastamento curto.",
    values: {
      title: "Atestado medico para repouso",
      purpose: "Necessidade de afastamento temporario das atividades habituais",
      restDays: "2",
      observations:
        "Recomenda-se repouso pelo periodo informado e retorno se persistirem sintomas."
    }
  },
  {
    label: "Acompanhante",
    description: "Base para justificar presenca de acompanhante.",
    values: {
      title: "Declaracao de acompanhante",
      purpose: "Necessidade de acompanhante em consulta ou assistencia",
      restDays: "",
      observations:
        "Declaro, para os devidos fins, a necessidade de acompanhante na presente assistencia."
    }
  }
];

const specialtyCertificatePresets: FormPreset[] = [
  {
    label: "Clinica medica",
    description: "Afastamento curto com observacao clinica padronizada.",
    values: {
      title: "Atestado de clinica medica",
      purpose: "Necessidade de afastamento temporario das atividades habituais",
      restDays: "2",
      observations:
        "Paciente avaliado nesta data, com recomendacao de repouso e reavaliacao conforme evolucao clinica."
    }
  },
  {
    label: "Psiquiatria",
    description: "Modelo inicial mais reservado para acompanhamento especializado.",
    values: {
      title: "Atestado medico",
      purpose: "Necessidade de afastamento temporario por avaliacao psiquiatrica",
      restDays: "7",
      observations:
        "Paciente em seguimento especializado, com necessidade de afastamento temporario e reavaliacao medica."
    }
  },
  {
    label: "Ortopedia",
    description: "Texto-base para limitacao funcional temporaria.",
    values: {
      title: "Atestado medico ortopedico",
      purpose: "Necessidade de afastamento temporario por limitacao funcional",
      restDays: "5",
      observations:
        "Paciente apresenta limitacao funcional temporaria, devendo manter repouso relativo e seguir em acompanhamento."
    }
  }
];

const freeDocumentPresets: FormPreset[] = [
  {
    label: "Relatorio sucinto",
    description: "Resumo clinico breve para continuidade assistencial.",
    values: {
      title: "Relatorio clinico sucinto",
      body:
        "Paciente em acompanhamento nesta unidade, com quadro clinico em seguimento, evolucao documentada e necessidade de continuidade do cuidado conforme avaliacao medica."
    }
  },
  {
    label: "Encaminhamento",
    description: "Base para encaminhar a outra especialidade ou servico.",
    values: {
      title: "Encaminhamento medico",
      body:
        "Encaminho paciente para avaliacao especializada, com objetivo de complementar investigacao diagnostica, estratificacao de risco e definicao de conduta terapeutica."
    }
  },
  {
    label: "Declaracao",
    description: "Modelo simples de declaracao clinica.",
    values: {
      title: "Declaracao medica",
      body:
        "Declaro, para os devidos fins, que o paciente encontra-se em acompanhamento medico nesta data."
    }
  },
  {
    label: "Relatorio para pericia",
    description: "Texto-base mais formal para fins administrativos.",
    values: {
      title: "Relatorio medico",
      body:
        "Apresento relatorio medico sucinto, contendo informacoes clinicas pertinentes, historico assistencial resumido e necessidade de seguimento conforme avaliacao realizada nesta data."
    }
  }
];

const legalClinicalPresets: FormPreset[] = [
  {
    label: "Relatorio para auditoria",
    description: "Texto mais formal para justificativa assistencial e documental.",
    values: {
      title: "Relatorio medico para auditoria",
      body:
        "Apresento relatorio medico com sintese clinica objetiva, fundamentos assistenciais, historico resumido e justificativa tecnica para a conduta adotada, nos limites desta avaliacao."
    }
  },
  {
    label: "Declaracao de seguimento",
    description: "Comprovacao formal de seguimento ambulatorial.",
    values: {
      title: "Declaracao de seguimento medico",
      body:
        "Declaro, para os devidos fins, que o paciente permanece em acompanhamento medico regular, com necessidade de seguimento conforme plano terapeutico em curso."
    }
  },
  {
    label: "Parecer clinico sucinto",
    description: "Base para opiniao tecnica breve e objetiva.",
    values: {
      title: "Parecer clinico",
      body:
        "Em avaliacao clinica nesta data, emito parecer sucinto com base nos achados assistenciais disponiveis, recomendando seguimento e complementariedade conforme necessidade clinica."
    }
  }
];

export function DocumentForm({ kind, title, description }: DocumentFormProps) {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [state, setState] = useState<FormState>(() => buildInitialState(kind));
  const [selectedExamCatalog, setSelectedExamCatalog] = useState<string[]>([]);
  const [specialtyTrack, setSpecialtyTrack] = useState<SpecialtyTrack | null>(null);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const api = createBrowserApiClient();

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

    api
      .me()
      .then((me) => {
        if (active) {
          setSpecialtyTrack(inferSpecialtyTrack(me.professionalProfile?.specialty));
        }
      })
      .catch(() => {
        if (active) {
          setSpecialtyTrack(null);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();

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
          ],
          context: {
            encounterType: "ambulatory",
            specialty: specialtyTrack ?? undefined
          },
          cdsOverride: state.cdsOverrideJustification.trim()
            ? {
                justification: state.cdsOverrideJustification.trim(),
                acceptedAlertCodes: ["all-required"]
              }
            : undefined
        };
        const created = await api.createPrescription(payload);
        if (created.type === "prescription" && created.cdsSummary?.alerts.length) {
          setMessage(
            `Rascunho criado com ${created.cdsSummary.alerts.length} alerta(s) clinico(s) para revisao.`
          );
          if (created.cdsSummary.alerts.some((alert) => alert.requiresOverrideJustification)) {
            setMessage(
              `Rascunho criado com ${created.cdsSummary.alerts.length} alerta(s). Ha alertas que exigem justificativa formal de override.`
            );
          }
        }
      }

      if (kind === "exam-request") {
        const requestedExams = buildExamRequestItems(state.requestedExams, selectedExamCatalog);
        const payload: CreateExamRequestInput = {
          patientId: state.patientId,
          title: state.title,
          requestedExams,
          preparationNotes: state.preparationNotes || undefined,
          context: {
            encounterType: "ambulatory",
            specialty: specialtyTrack ?? undefined
          }
        };
        await api.createExamRequest(payload);
      }

      if (kind === "medical-certificate") {
        const payload: CreateMedicalCertificateInput = {
          patientId: state.patientId,
          title: state.title,
          purpose: state.purpose,
          restDays: state.restDays ? Number(state.restDays) : undefined,
          observations: state.observations || undefined,
          context: {
            encounterType: "ambulatory",
            specialty: specialtyTrack ?? undefined
          }
        };
        await api.createMedicalCertificate(payload);
      }

      if (kind === "free-document") {
        const payload: CreateFreeDocumentInput = {
          patientId: state.patientId,
          title: state.title,
          body: state.body,
          context: {
            encounterType: "ambulatory",
            specialty: specialtyTrack ?? undefined
          }
        };
        await api.createFreeDocument(payload);
      }

      setMessage((current) => current ?? "Rascunho criado com sucesso na API.");
      setState((current) => ({
        ...buildInitialState(kind),
        patientId: current.patientId
      }));
      setSelectedExamCatalog([]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao enviar o documento.");
    } finally {
      setSubmitting(false);
    }
  }

  const recommendedExamPresets = getRecommendedPresets("exam-request");
  const recommendedPrescriptionPresets = getRecommendedPresets("prescription");
  const recommendedCertificatePresets = getRecommendedPresets("medical-certificate");
  const recommendedFreeDocumentPresets = getRecommendedPresets("free-document");

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
            {recommendedPrescriptionPresets.length > 0 ? (
              <PresetButtons
                title="Recomendados para sua especialidade"
                presets={recommendedPrescriptionPresets}
                onApply={applyPreset}
              />
            ) : null}
            <PresetButtons title="Modelos rapidos" presets={prescriptionPresets} onApply={applyPreset} />
            <PresetButtons title="Sugestoes por especialidade" presets={specialtyPrescriptionPresets} onApply={applyPreset} />
            <label style={fieldStyle}>
              <span>Medicamento</span>
              <input
                value={state.medicationName}
                onChange={(event) => updateField("medicationName", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Principio ativo</span>
              <input
                value={state.activeIngredient}
                onChange={(event) => updateField("activeIngredient", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Dosagem</span>
              <input
                value={state.dosage}
                onChange={(event) => updateField("dosage", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Via</span>
              <input
                value={state.route}
                onChange={(event) => updateField("route", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Frequencia</span>
              <input
                value={state.frequency}
                onChange={(event) => updateField("frequency", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Duracao</span>
              <input
                value={state.duration}
                onChange={(event) => updateField("duration", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Quantidade</span>
              <input
                value={state.quantity}
                onChange={(event) => updateField("quantity", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Observacoes</span>
              <textarea
                value={state.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                style={textAreaStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Justificativa de override clinico</span>
              <textarea
                value={state.cdsOverrideJustification}
                onChange={(event) =>
                  updateField("cdsOverrideJustification", event.target.value)
                }
                style={textAreaStyle}
                disabled={submitting}
                placeholder="Preencha apenas se decidir manter a prescricao apesar de alertas clinicos relevantes."
              />
            </label>
          </>
        ) : null}

        {kind === "exam-request" ? (
          <>
            {recommendedExamPresets.length > 0 ? (
              <PresetButtons
                title="Recomendados para sua especialidade"
                presets={recommendedExamPresets}
                onApply={applyPreset}
              />
            ) : null}
            <PresetButtons title="Paineis laboratoriais" presets={examPanelPresets} onApply={applyPreset} />
            <PresetButtons title="Sugestoes por especialidade" presets={specialtyExamPresets} onApply={applyPreset} />
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ fontWeight: 600 }}>Checklist laboratorial</div>
              <div style={{ display: "grid", gap: 16 }}>
                {labExamGroups.map((group) => (
                  <div key={group.label} style={examGroupStyle}>
                    <div style={{ fontWeight: 700 }}>{group.label}</div>
                    <div style={{ color: "var(--muted)", fontSize: 14 }}>{group.description}</div>
                    <div style={examCatalogGridStyle}>
                      {group.exams.map((exam) => {
                        const selected = selectedExamCatalog.includes(exam);

                        return (
                          <label key={exam} style={selected ? selectedExamChipStyle : examChipStyle}>
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleExamCatalogItem(exam)}
                              disabled={submitting}
                              style={{ accentColor: "var(--primary)" }}
                            />
                            <span>{exam}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <label style={fieldStyle}>
              <span>Exames personalizados</span>
              <textarea
                value={state.requestedExams}
                onChange={(event) => updateField("requestedExams", event.target.value)}
                style={textAreaStyle}
                disabled={submitting}
                placeholder="Use uma linha por exame para complementar ou personalizar o pedido."
              />
            </label>
            <label style={fieldStyle}>
              <span>Preparo e observacoes</span>
              <textarea
                value={state.preparationNotes}
                onChange={(event) => updateField("preparationNotes", event.target.value)}
                style={textAreaStyle}
                disabled={submitting}
              />
            </label>
          </>
        ) : null}

        {kind === "medical-certificate" ? (
          <>
            {recommendedCertificatePresets.length > 0 ? (
              <PresetButtons
                title="Recomendados para sua especialidade"
                presets={recommendedCertificatePresets}
                onApply={applyPreset}
              />
            ) : null}
            <PresetButtons title="Textos-base" presets={medicalCertificatePresets} onApply={applyPreset} />
            <PresetButtons title="Sugestoes por especialidade" presets={specialtyCertificatePresets} onApply={applyPreset} />
            <label style={fieldStyle}>
              <span>Finalidade</span>
              <input
                value={state.purpose}
                onChange={(event) => updateField("purpose", event.target.value)}
                style={inputStyle}
                disabled={submitting}
              />
            </label>
            <label style={fieldStyle}>
              <span>Dias de afastamento</span>
              <input
                value={state.restDays}
                onChange={(event) => updateField("restDays", event.target.value)}
                style={inputStyle}
                disabled={submitting}
                inputMode="numeric"
              />
            </label>
            <label style={fieldStyle}>
              <span>Observacoes</span>
              <textarea
                value={state.observations}
                onChange={(event) => updateField("observations", event.target.value)}
                style={textAreaStyle}
                disabled={submitting}
              />
            </label>
          </>
        ) : null}

        {kind === "free-document" ? (
          <>
            {recommendedFreeDocumentPresets.length > 0 ? (
              <PresetButtons
                title="Recomendados para sua especialidade"
                presets={recommendedFreeDocumentPresets}
                onApply={applyPreset}
              />
            ) : null}
            <PresetButtons title="Modelos padronizados" presets={freeDocumentPresets} onApply={applyPreset} />
            <PresetButtons title="Biblioteca juridico-clinica" presets={legalClinicalPresets} onApply={applyPreset} />
            <label style={fieldStyle}>
              <span>Corpo do documento</span>
              <textarea
                value={state.body}
                onChange={(event) => updateField("body", event.target.value)}
                style={{ ...textAreaStyle, minHeight: 220 }}
                disabled={submitting}
              />
            </label>
          </>
        ) : null}

        {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
        {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}

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

  function toggleExamCatalogItem(exam: string) {
    setSelectedExamCatalog((current) =>
      current.includes(exam)
        ? current.filter((item) => item !== exam)
        : [...current, exam]
    );
  }

  function applyPreset(preset: FormPreset) {
    setState((current) => ({
      ...current,
      ...preset.values
    }));

    if (preset.selectedExams) {
      setSelectedExamCatalog(preset.selectedExams);
    }
  }

  function getRecommendedPresets(kindFilter: FormKind) {
    if (!specialtyTrack) {
      return [];
    }

    if (kindFilter === "exam-request") {
      return specialtyExamPresets.filter((preset) =>
        specialtyPresetMatchesTrack(preset.label, specialtyTrack)
      );
    }

    if (kindFilter === "prescription") {
      return specialtyPrescriptionPresets.filter((preset) =>
        specialtyPresetMatchesTrack(preset.label, specialtyTrack)
      );
    }

    if (kindFilter === "medical-certificate") {
      return specialtyCertificatePresets.filter((preset) =>
        specialtyPresetMatchesTrack(preset.label, specialtyTrack)
      );
    }

    return legalClinicalPresets.filter((preset) =>
      specialtyPresetSupportsTrack(preset.label, specialtyTrack)
    );
  }
}

function createBrowserApiClient() {
  const token = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("receituario_access_token="))
    ?.split("=")[1];

  return new ApiClient(getBrowserApiBaseUrl(), token ? decodeURIComponent(token) : undefined);
}

function buildInitialState(kind: FormKind): FormState {
  return {
    ...initialState,
    ...defaultValuesByKind[kind]
  };
}

function buildExamRequestItems(freeText: string, selectedCatalog: string[]) {
  const typedItems = freeText
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  return Array.from(new Set([...selectedCatalog, ...typedItems]));
}

function specialtyPresetMatchesTrack(label: string, specialtyTrack: SpecialtyTrack) {
  const normalizedLabel = label.toLowerCase();

  return (
    normalizedLabel.includes(specialtyTrack.replace("-", " ")) ||
    normalizedLabel.includes(specialtyTrack.split("-")[0]!)
  );
}

function specialtyPresetSupportsTrack(label: string, specialtyTrack: SpecialtyTrack) {
  if (specialtyTrack === "clinica-medica") {
    return true;
  }

  return specialtyPresetMatchesTrack(label, specialtyTrack);
}

function PresetButtons({
  title,
  presets,
  onApply
}: {
  title: string;
  presets: FormPreset[];
  onApply: (preset: FormPreset) => void;
}) {
  return (
    <div style={{ display: "grid", gap: 10 }}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div style={presetGridStyle}>
        {presets.map((preset) => (
          <button key={preset.label} type="button" onClick={() => onApply(preset)} style={presetButtonStyle}>
            <span style={{ fontWeight: 700 }}>{preset.label}</span>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>{preset.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
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

const examCatalogGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10
};

const examGroupStyle = {
  display: "grid",
  gap: 10,
  padding: "16px 18px",
  borderRadius: 18,
  border: "1px solid #d7e6f6",
  background: "#fbfdff"
};

const examChipStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid #c9d8ea",
  background: "#f7fbff",
  fontWeight: 500
};

const selectedExamChipStyle = {
  ...examChipStyle,
  border: "1px solid rgba(11, 99, 206, 0.45)",
  background: "rgba(93, 183, 255, 0.16)"
};

const presetGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10
};

const presetButtonStyle = {
  display: "grid",
  gap: 6,
  textAlign: "left" as const,
  padding: "14px 16px",
  borderRadius: 16,
  border: "1px solid #c9d8ea",
  background: "#f8fbff",
  cursor: "pointer"
};
