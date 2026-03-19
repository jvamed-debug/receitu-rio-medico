import { LoginForm } from "../../components/auth/login-form";
import { PageSection } from "../../components/page-section";

export default function LoginPage() {
  return (
    <main style={{ maxWidth: 560, margin: "0 auto", padding: "72px 24px" }}>
      <PageSection
        title="Acesso profissional"
        description="Entrada principal do prescritor com MFA futuro, sessao web protegida e separacao entre autenticacao e assinatura."
      >
        <LoginForm />
        <div style={{ marginTop: 16 }}>
          <a href="/onboarding" style={{ color: "var(--primary)" }}>
            Primeiro acesso e validacao profissional
          </a>
        </div>
      </PageSection>
    </main>
  );
}
