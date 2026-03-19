import { Shell } from "../../components/shell";
import { ProfessionalProfileForm } from "../../components/auth/professional-profile-form";
import { FeatureList } from "../../components/feature-list";
import { PageSection } from "../../components/page-section";
import { createServerApiClient } from "../../lib/api";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const api = await createServerApiClient();
  const me = await api.me().catch(() => null);
  const profile = me?.professionalProfile as
    | {
        documentNumber?: string | null;
        councilType?: string | null;
        councilState?: string | null;
        rqe?: string | null;
        specialty?: string | null;
        cbo?: string | null;
        cnes?: string | null;
        status?: string | null;
      }
    | undefined;

  return (
    <Shell
      title="Onboarding profissional"
      subtitle="Jornada inicial para cadastro, validacao do perfil de saude e habilitacao da assinatura, com retorno facil ao dashboard."
      actions={
        <a href="/dashboard" style={actionLinkStyle}>
          Voltar ao dashboard
        </a>
      }
    >
      <div style={{ display: "grid", gap: 20 }}>
        <PageSection
          title="Panorama inicial"
          description="Preencha os dados essenciais e siga para assinatura sem se perder entre as telas."
        >
          <FeatureList
            items={[
              `Sessao atual: ${me?.email ?? "nao autenticado"}`,
              `Status profissional: ${profile?.status ?? "desconhecido"}`,
              "Preencha os dados abaixo para deixar o perfil pronto para emissao",
              "Depois disso, siga para validacao da assinatura em /signature-validation"
            ]}
          />
        </PageSection>
        <PageSection
          title="Dados profissionais"
          description="Formulario conectado ao backend para atualizar conselho, RQE, especialidade e identificadores opcionais."
        >
          <ProfessionalProfileForm initialValues={profile} />
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
