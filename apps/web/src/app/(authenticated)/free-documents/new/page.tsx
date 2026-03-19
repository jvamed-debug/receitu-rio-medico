import { DocumentForm } from "../../../../components/documents/document-form";
import { Shell } from "../../../../components/shell";

export default function FreeDocumentCreatePage() {
  return (
    <Shell
      title="Documento livre"
      subtitle="Formulario conectado a API para criar o rascunho inicial da folha em branco."
    >
      <DocumentForm
        kind="free-document"
        title="Conteudo do documento"
        description="Preencha o minimo necessario para registrar o draft no backend."
      />
    </Shell>
  );
}
