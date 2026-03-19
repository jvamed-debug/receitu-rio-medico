import { DeliveryPanel } from "../../../components/documents/delivery-panel";
import { PageSection } from "../../../components/page-section";
import { Shell } from "../../../components/shell";

export const dynamic = "force-dynamic";

export default async function DeliveryPage({
  searchParams
}: {
  searchParams: Promise<{ documentId?: string }>;
}) {
  const { documentId } = await searchParams;

  return (
    <Shell
      title="Entrega e compartilhamento"
      subtitle="Base para envio por e-mail, link seguro e rastreabilidade do compartilhamento."
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection title="Canais iniciais" description="A entrega faz parte da trilha auditavel e nao altera o documento emitido." />
        <DeliveryPanel documentId={documentId} />
      </div>
    </Shell>
  );
}
