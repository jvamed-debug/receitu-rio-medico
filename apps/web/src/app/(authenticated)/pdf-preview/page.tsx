import { PageSection } from "../../../components/page-section";
import { SignatureOperations } from "../../../components/signature/signature-operations";
import { Shell } from "../../../components/shell";
import { createApiClient } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function PdfPreviewPage({
  searchParams
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;
  const api = createApiClient();
  const [document, preview] = documentId
    ? await Promise.all([
        api.getDocument(documentId).catch(() => null),
        api.getDocumentPdf(documentId).catch(() => null)
      ])
    : [null, null];

  return (
    <Shell
      title="Preview do PDF"
      subtitle="Tela base para visualizacao fiel do artefato final antes da emissao e assinatura."
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection
          title="Selecao atual"
          description="Use o parametro `documentId` para abrir o preview operacional a partir da lista de documentos."
        >
          <div style={{ display: "grid", gap: 10 }}>
            <div>Documento: {document?.title ?? "nenhum selecionado"}</div>
            <div>Status: {document?.status ?? "aguardando selecao"}</div>
            <div>Layout: {preview?.layoutVersion ?? "nao gerado"}</div>
            <div>Payload: {preview?.payloadVersion ?? "nao gerado"}</div>
            <div>Schema: {preview?.schemaVersion ?? "nao gerado"}</div>
            <div>Contrato: {preview?.contractVersion ?? "nao gerado"}</div>
            <div>Modo do preview: {preview?.previewMode ?? "pendente"}</div>
            <div>Artefato: {preview?.artifact?.storageKey ?? "ainda nao emitido"}</div>
            <div>Hash: {preview?.payloadHash ?? "ainda nao calculado"}</div>
            <div>Geracao: {preview?.status ?? "pendente"}</div>
            {preview?.sections?.length ? (
              <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
                {preview.sections.map((section) => (
                  <div
                    key={section.title}
                    style={{
                      border: "1px solid #d8e2dc",
                      borderRadius: 16,
                      padding: 16,
                      background: "#f8fbf9"
                    }}
                  >
                    <strong>{section.title}</strong>
                    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                      {section.lines.length > 0 ? (
                        section.lines.map((line) => <div key={line}>{line}</div>)
                      ) : (
                        <div>Nenhum conteudo adicional nesta secao.</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </PageSection>
        <SignatureOperations documentId={documentId} />
      </div>
    </Shell>
  );
}
