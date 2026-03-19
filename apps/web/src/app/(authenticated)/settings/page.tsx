import { FeatureList } from "../../../components/feature-list";
import { PageSection } from "../../../components/page-section";
import { Shell } from "../../../components/shell";

export default function SettingsPage() {
  return (
    <Shell
      title="Configuracoes"
      subtitle="Branding controlado, painel de assinatura, janelas temporarias e preferencias operacionais."
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection title="Branding do receituario" description="Logo, cabecalho, rodape e campos institucionais permitidos.">
          <FeatureList
            items={[
              "Upload de logo e elementos visuais",
              "Configuracao do rodape institucional",
              "Politica de campos obrigatorios travados",
              "Versionamento de layout"
            ]}
          />
        </PageSection>
        <PageSection title="Assinatura e seguranca" description="Controles operacionais que nao substituem o ato juridico de assinar.">
          <FeatureList
            items={[
              "Painel de readiness do provedor",
              "Janela temporaria de autorizacao",
              "Auditoria de eventos criticos",
              "Preferencias de sessao e envio"
            ]}
          />
        </PageSection>
      </div>
    </Shell>
  );
}
