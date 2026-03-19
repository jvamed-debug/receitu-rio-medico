import { DocumentList } from "../../../../components/documents/document-list";
import { PageSection } from "../../../../components/page-section";
import { Shell } from "../../../../components/shell";
import { createApiClient } from "../../../../lib/api";

export const dynamic = "force-dynamic";

export default async function PatientProfilePage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = createApiClient();
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
        <DocumentList title="Historico do paciente" documents={history.items} />
      </div>
    </Shell>
  );
}
