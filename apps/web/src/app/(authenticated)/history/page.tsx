import { DocumentList } from "../../../components/documents/document-list";
import { PageSection } from "../../../components/page-section";
import { Shell } from "../../../components/shell";
import { createApiClient } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function loadHistory() {
  const api = createApiClient();

  try {
    return await api.getHistory();
  } catch {
    return {
      items: [],
      filters: []
    };
  }
}

export default async function HistoryPage() {
  const history = await loadHistory();

  return (
    <Shell
      title="Historico documental"
      subtitle="Consulta geral dos documentos emitidos, reenviados e duplicados com filtros operacionais."
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection
          title="Filtros disponiveis"
          description="Campos que ja retornam do endpoint de historico para orientar a futura camada de busca."
        >
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {history.filters.map((filter) => (
              <span
                key={filter}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  background: "#f7faf8",
                  border: "1px solid #d8e2dc"
                }}
              >
                {filter}
              </span>
            ))}
          </div>
        </PageSection>
        <DocumentList title="Linha do tempo geral" documents={history.items} />
      </div>
    </Shell>
  );
}
