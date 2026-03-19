import { PageSection } from "../components/page-section";

const entryPoints = [
  ["Login", "/login"],
  ["Onboarding", "/onboarding"],
  ["Dashboard", "/dashboard"],
  ["Pacientes", "/patients"],
  ["Modelos", "/templates"]
] as const;

export default function LandingPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "56px 24px",
        display: "grid",
        gap: 24,
        maxWidth: 1180,
        margin: "0 auto"
      }}
    >
      <section
        style={{
          background:
            "linear-gradient(140deg, rgba(10,127,90,0.96), rgba(217,164,65,0.92))",
          color: "white",
          borderRadius: 28,
          padding: 36
        }}
      >
        <div style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: 1.2 }}>
          Receituario Medico Digital
        </div>
        <h1 style={{ marginBottom: 12, fontSize: 54 }}>
          Plataforma web para documentos clinicos, assinatura e historico auditavel.
        </h1>
        <p style={{ maxWidth: 740, lineHeight: 1.6, fontSize: 18 }}>
          Base inicial do frontend do MVP regulado, com telas de onboarding, emissao,
          PDF, entrega e linha do tempo por paciente.
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          {entryPoints.map(([label, href]) => (
            <a
              key={href}
              href={href}
              style={{
                background: "rgba(255,255,255,0.14)",
                padding: "14px 18px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.18)"
              }}
            >
              {label}
            </a>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <PageSection
          title="Fluxos cobertos"
          description="Login, onboarding, documentos, templates, PDF, entrega e historico."
        />
        <PageSection
          title="Alvo do MVP"
          description="Profissional prescritor com experiencia consistente entre web e mobile."
        />
        <PageSection
          title="Proximo passo"
          description="Conectar formulários, assinatura e estados reais do backend."
        />
      </div>
    </main>
  );
}
