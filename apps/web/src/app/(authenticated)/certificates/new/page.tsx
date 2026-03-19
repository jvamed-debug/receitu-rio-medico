import { DocumentForm } from "../../../../components/documents/document-form";
import { Shell } from "../../../../components/shell";

export default function CertificateCreatePage() {
  return (
    <Shell
      title="Novo atestado"
      subtitle="Formulario conectado a API para criar o rascunho inicial do atestado medico."
    >
      <DocumentForm
        kind="medical-certificate"
        title="Dados do atestado"
        description="Defina finalidade, periodo e observacoes para abrir o draft."
      />
    </Shell>
  );
}
