import { DocumentForm } from "../../../../components/documents/document-form";
import { Shell } from "../../../../components/shell";

export default function PrescriptionCreatePage() {
  return (
    <Shell
      title="Nova prescricao"
      subtitle="Formulario conectado a API para criar o rascunho inicial da prescricao medicamentosa."
    >
      <DocumentForm
        kind="prescription"
        title="Dados da prescricao"
        description="Preencha o minimo necessario para abrir o draft no backend."
      />
    </Shell>
  );
}
