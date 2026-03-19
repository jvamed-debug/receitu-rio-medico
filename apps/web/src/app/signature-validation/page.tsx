import { Shell } from "../../components/shell";
import { SignatureMethodForm } from "../../components/auth/signature-method-form";
import { FeatureList } from "../../components/feature-list";
import { PageSection } from "../../components/page-section";
import { SignatureOperations } from "../../components/signature/signature-operations";
import { createServerApiClient } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function SignatureValidationPage() {
  const api = await createServerApiClient();
  const me = await api.me().catch(() => null);
  const profile = me?.professionalProfile as
    | {
        signatureProvider?: string | null;
        signatureValidatedAt?: string | null;
      }
    | undefined;

  return (
    <Shell
      title="Validacao da assinatura"
      subtitle="Configuracao do provedor e da janela temporaria, com navegacao simples entre assinatura, onboarding e dashboard."
      actions={
        <div style={{ display: "flex", gap: 12 }}>
          <a href="/onboarding" style={actionLinkStyle}>
            Voltar ao onboarding
          </a>
          <a href="/dashboard" style={actionLinkStyle}>
            Ir ao dashboard
          </a>
        </div>
      }
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection
          title="Panorama da assinatura"
          description="Tela base para vinculacao do provedor, verificacao do metodo e readiness por tipo documental."
        >
          <FeatureList
            items={[
              `Usuario: ${me?.email ?? "nao autenticado"}`,
              `Provedor atual: ${profile?.signatureProvider ?? "nao configurado"}`,
              `Ultima validacao: ${profile?.signatureValidatedAt ?? "pendente"}`,
              "Cada documento continuara exigindo assinatura individual"
            ]}
          />
        </PageSection>
        <PageSection
          title="Metodo de assinatura"
          description="Formulario conectado ao backend para registrar o provedor inicial do profissional."
        >
          <SignatureMethodForm initialProvider={profile?.signatureProvider} />
        </PageSection>
        <PageSection
          title="Janela temporaria"
          description="Operacao inicial para reduzir friccao sem substituir a assinatura individual por documento."
        >
          <SignatureOperations />
        </PageSection>
      </div>
    </Shell>
  );
}

const actionLinkStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 14,
  border: "1px solid #c9d8ea",
  background: "#ffffff",
  padding: "12px 16px",
  fontWeight: 700
};
