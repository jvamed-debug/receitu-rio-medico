import { DocumentList } from "../../../components/documents/document-list";
import { Shell } from "../../../components/shell";
import { createApiClient } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function loadDocuments() {
  const api = createApiClient();

  try {
    return await api.listDocuments();
  } catch {
    return [];
  }
}

export default async function DocumentsPage() {
  const documents = await loadDocuments();

  return (
    <Shell
      title="Documentos"
      subtitle="Central operacional para iniciar prescricoes, exames, atestados e documentos livres."
      actions={<a href="/documents/new" style={actionLinkStyle}>Novo documento</a>}
    >
      <DocumentList title="Documentos registrados" documents={documents} />
    </Shell>
  );
}

const actionLinkStyle = {
  display: "inline-block",
  background: "var(--primary)",
  color: "white",
  padding: "12px 18px",
  borderRadius: 14
};
