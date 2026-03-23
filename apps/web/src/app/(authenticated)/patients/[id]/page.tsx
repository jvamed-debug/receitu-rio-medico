import { ClinicalProfileEditor } from "../../../../components/patients/clinical-profile-editor";
import { PatientEncounterEditor } from "../../../../components/patients/patient-encounter-editor";
import { PatientEvolutionEditor } from "../../../../components/patients/patient-evolution-editor";
import { DocumentList } from "../../../../components/documents/document-list";
import { PageSection } from "../../../../components/page-section";
import { Shell } from "../../../../components/shell";
import { createServerApiClient } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export default async function PatientProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await createServerApiClient();
  const [patient, history, encounters, evolutions, timeline] = await Promise.all([
    api.getPatient(id).catch(() => null),
    api.getPatientHistory(id).catch(() => ({ patientId: id, items: [] })),
    api.listPatientEncounters(id).catch(() => []),
    api.listPatientEvolutions(id).catch(() => []),
    api.getPatientTimeline(id).catch(() => ({ patientId: id, items: [] }))
  ]);

  return (
    <Shell
      title="Perfil do paciente"
      subtitle={`Linha do tempo individual, reenvio de documentos e duplicacao segura para ${patient?.fullName ?? id}.`}
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection title="Resumo cadastral" description="Dados trazidos da API de pacientes.">
          <div style={{ display: "grid", gap: 10 }}>
            <div>Nome: {patient?.fullName ?? "nao encontrado"}</div>
            <div>CPF: {patient?.cpf ?? "nao informado"}</div>
            <div>CNS: {patient?.cns ?? "nao informado"}</div>
            <div>E-mail: {patient?.email ?? "nao informado"}</div>
            <div>Telefone: {patient?.phone ?? "nao informado"}</div>
          </div>
        </PageSection>
        <PageSection
          title="Perfil clinico atual"
          description="Resumo estruturado para alergias, condicoes, medicamentos cronicos e plano de cuidado."
        >
          <div style={{ display: "grid", gap: 16 }}>
            <div>
              <strong>Resumo:</strong>{" "}
              {patient?.clinicalProfile?.summary ?? "Ainda nao registrado."}
            </div>
            <div style={gridStyle}>
              <ClinicalBlock
                title="Alergias"
                items={(patient?.clinicalProfile?.allergies ?? []).map((item) =>
                  [item.substance, item.reaction, item.severity].filter(Boolean).join(" | ")
                )}
              />
              <ClinicalBlock
                title="Condicoes"
                items={(patient?.clinicalProfile?.conditions ?? []).map((item) =>
                  [item.name, item.status, item.notes].filter(Boolean).join(" | ")
                )}
              />
              <ClinicalBlock
                title="Medicamentos cronicos"
                items={(patient?.clinicalProfile?.chronicMedications ?? []).map((item) =>
                  [item.name, item.dosage, item.frequency].filter(Boolean).join(" | ")
                )}
              />
              <ClinicalBlock
                title="Plano de cuidado"
                items={(patient?.clinicalProfile?.carePlan ?? []).map((item) =>
                  [item.title, item.notes].filter(Boolean).join(" | ")
                )}
              />
            </div>
          </div>
        </PageSection>
        <ClinicalProfileEditor
          patientId={id}
          initialProfile={patient?.clinicalProfile}
        />
        <PatientEncounterEditor patientId={id} initialEncounters={encounters} />
        <PatientEvolutionEditor
          patientId={id}
          initialEvolutions={evolutions}
          initialEncounterOptions={encounters.map((encounter) => ({
            id: encounter.id,
            title: encounter.title
          }))}
        />
        <PageSection
          title="Timeline assistencial"
          description="Consolidacao longitudinal de evolucoes, encounters, consultas e documentos do paciente."
        >
          <div style={{ display: "grid", gap: 12 }}>
            {timeline.items.length > 0 ? (
              timeline.items.map((item) => (
                <article
                  key={item.id}
                  style={{
                    borderRadius: 16,
                    border: "1px solid #d4e1ef",
                    padding: 16,
                    background: "#f8fbff"
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap"
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span style={{ color: "var(--muted)" }}>
                      {new Date(item.occurredAt).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  <div style={{ marginTop: 6, color: "var(--muted)" }}>
                    {[item.sourceType, item.subtitle, item.status].filter(Boolean).join(" | ")}
                  </div>
                  {item.summary ? (
                    <div style={{ marginTop: 10, whiteSpace: "pre-wrap" }}>{item.summary}</div>
                  ) : null}
                </article>
              ))
            ) : (
              <div style={{ color: "var(--muted)" }}>
                Sem eventos na timeline ainda.
              </div>
            )}
          </div>
        </PageSection>
        <DocumentList title="Historico do paciente" documents={history.items} />
      </div>
    </Shell>
  );
}

function ClinicalBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid #d4e1ef",
        padding: 16,
        background: "#f8fbff"
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: 8 }}>{title}</div>
      {items.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8 }}>
          {items.map((item) => (
            <li key={`${title}-${item}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div style={{ color: "var(--muted)" }}>Sem registros no momento.</div>
      )}
    </div>
  );
}

const gridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
};
