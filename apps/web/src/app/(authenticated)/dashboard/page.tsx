import { Shell } from "../../../components/shell";
import { createApiClient, getApiBaseUrl } from "../../../lib/api";

export const dynamic = "force-dynamic";

const cards = [
  { label: "Documentos emitidos", value: "0" },
  { label: "Pendentes de assinatura", value: "0" },
  { label: "Pacientes ativos", value: "0" },
  { label: "Templates", value: "1" }
] as const;

async function loadHealth() {
  const api = createApiClient();

  try {
    return await api.getHealth();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const health = await loadHealth();

  return (
    <Shell
      title="Operacao assistida"
      subtitle="Readiness do backend e proximos marcos tecnicos do MVP clinico regulado."
    >
      <div
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
        }}
      >
        {cards.map((card) => (
          <article
            key={card.label}
            style={{
              background: "var(--surface)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)"
            }}
          >
            <div style={{ color: "var(--muted)", fontSize: 14 }}>{card.label}</div>
            <div style={{ fontSize: 36, marginTop: 12 }}>{card.value}</div>
          </article>
        ))}
      </div>

      <section
        style={{
          marginTop: 24,
          background: "white",
          borderRadius: 20,
          padding: 24,
          boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Saude da API</h2>
        {health ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              API: <strong>{health.status}</strong> em {health.environment}
            </div>
            <div>Servico: {health.service}</div>
            <div>Atualizado em: {new Date(health.timestamp).toLocaleString("pt-BR")}</div>
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
              }}
            >
              {Object.entries(health.dependencies).map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    background: "#f7faf8",
                    borderRadius: 14,
                    padding: 12,
                    border: "1px solid #d9e8de"
                  }}
                >
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>{key}</div>
                  <div style={{ fontWeight: 700 }}>{value ? "configurado" : "pendente"}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--muted)" }}>
            A API ainda nao respondeu. Verifique se `apps/api` esta rodando em {getApiBaseUrl()}.
          </div>
        )}
      </section>
    </Shell>
  );
}
