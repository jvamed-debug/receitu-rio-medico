import { DocumentForm } from "../../../../components/documents/document-form";
import { Shell } from "../../../../components/shell";

export default function ExamRequestCreatePage() {
  return (
    <Shell
      title="Solicitacao de exame"
      subtitle="Formulario conectado a API para criar o rascunho inicial da solicitacao de exames."
    >
      <DocumentForm
        kind="exam-request"
        title="Dados da solicitacao"
        description="Informe paciente, titulo e exames solicitados para abrir o draft."
      />
    </Shell>
  );
}
