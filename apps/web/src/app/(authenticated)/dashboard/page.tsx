import { Shell } from "../../../components/shell";
import { createApiClient, getApiBaseUrl } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function loadHealth() {
  const api = createApiClient();

  try {
    return await api.getHealth();
  } catch {
    return null;
  }
}

async function loadAppointmentsSummary() {
  const api = createApiClient();

  try {
    return await api.getAppointmentSummary();
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const [health, agenda] = await Promise.all([
    loadHealth(),
    loadAppointmentsSummary()
  ]);

  const cards = [
    { label: "Consultas", value: String(agenda?.total ?? 0) },
    { label: "Teleconsultas", value: String(agenda?.telehealth ?? 0) },
    { label: "Lembretes pendentes", value: String(agenda?.remindersPending ?? 0) },
    { label: "Cobrancas pagas", value: String(agenda?.billingPaidCount ?? 0) }
  ] as const;

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
        <h2 style={{ marginTop: 0 }}>Resumo financeiro da agenda</h2>
        {agenda ? (
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
            }}
          >
            <FinanceCard
              label="A receber"
              amount={agenda.billingPendingCents}
              detail={`${agenda.billingPendingCount} cobrancas pendentes`}
            />
            <FinanceCard
              label="Autorizado"
              amount={agenda.billingAuthorizedCents}
              detail={`${agenda.billingAuthorizedCount} cobrancas autorizadas`}
            />
            <FinanceCard
              label="Recebido"
              amount={agenda.billingPaidCents}
              detail={`${agenda.billingPaidCount} cobrancas pagas`}
            />
          </div>
        ) : (
          <div style={{ color: "var(--muted)" }}>
            Nao foi possivel carregar o resumo financeiro da agenda.
          </div>
        )}
      </section>

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

function FinanceCard({
  label,
  amount,
  detail
}: {
  label: string;
  amount: number;
  detail: string;
}) {
  return (
    <article
      style={{
        background: "#f7fbff",
        borderRadius: 18,
        padding: 18,
        border: "1px solid #d9e8f5"
      }}
    >
      <div style={{ color: "var(--muted)", fontSize: 14 }}>{label}</div>
      <div style={{ fontSize: 28, marginTop: 10 }}>
        {new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL"
        }).format(amount / 100)}
      </div>
      <div style={{ color: "var(--muted)", marginTop: 8 }}>{detail}</div>
    </article>
  );
}
