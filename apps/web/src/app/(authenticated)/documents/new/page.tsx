import { PageSection } from "../../../../components/page-section";
import { Shell } from "../../../../components/shell";

const options = [
  ["Prescricao", "/prescriptions/new"],
  ["Exame", "/exam-requests/new"],
  ["Atestado", "/certificates/new"],
  ["Documento livre", "/free-documents/new"],
  ["Template", "/templates"]
] as const;

export default function NewDocumentPage() {
  return (
    <Shell
      title="Novo documento"
      subtitle="Escolha o tipo documental e siga para preenchimento estruturado ou modelo pre-configurado."
    >
      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        {options.map(([label, href]) => (
          <a
            key={href}
            href={href}
            style={{
              background: "white",
              padding: 24,
              borderRadius: 20,
              boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)"
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 700 }}>{label}</div>
            <div style={{ color: "var(--muted)", marginTop: 8 }}>Abrir fluxo base</div>
          </a>
        ))}
      </div>
      <div style={{ marginTop: 20 }}>
        <PageSection
          title="Regras do MVP"
          description="Todo fluxo deve passar por revisao, assinatura individual e geracao de PDF final."
        />
      </div>
    </Shell>
  );
}
