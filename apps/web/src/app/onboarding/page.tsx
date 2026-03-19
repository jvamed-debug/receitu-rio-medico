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
        specialty?: string | null;
        cbo?: string | null;
        cnes?: string | null;
        status?: string | null;
      }
    | undefined;

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "56px 24px", display: "grid", gap: 20 }}>
      <PageSection
        title="Onboarding profissional"
        description="Jornada inicial para cadastro, validacao do perfil de saude e habilitacao de assinatura."
      >
        <FeatureList
          items={[
            `Sessao atual: ${me?.email ?? "nao autenticado"}`,
            `Status profissional: ${profile?.status ?? "desconhecido"}`,
            "Preencha os dados abaixo para deixar o perfil pronto para emissao",
            "Depois disso, siga para validacao da assinatura"
          ]}
        />
      </PageSection>
      <PageSection
        title="Dados profissionais"
        description="Formulario conectado ao backend para atualizar conselho, especialidade e identificadores."
      >
        <ProfessionalProfileForm initialValues={profile} />
      </PageSection>
    </main>
  );
}
