import { ClinicalProfileEditor } from "../../../../components/patients/clinical-profile-editor";
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
  const [patient, history] = await Promise.all([
    api.getPatient(id).catch(() => null),
    api.getPatientHistory(id).catch(() => ({ patientId: id, items: [] }))
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
