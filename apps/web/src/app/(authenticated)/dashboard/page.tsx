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

async function loadAppointmentOperations() {
  const api = createApiClient();

  try {
    return await api.getAppointmentOperations();
  } catch {
    return null;
  }
}

async function loadAppointmentAnalytics() {
  const api = createApiClient();
  const today = new Date();
  const dateTo = today.toISOString();
  const dateFrom = new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000).toISOString();

  try {
    return await api.getAppointmentAnalytics({
      dateFrom,
      dateTo
    });
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const [health, agenda, operations, analytics] = await Promise.all([
    loadHealth(),
    loadAppointmentsSummary(),
    loadAppointmentOperations(),
    loadAppointmentAnalytics()
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
        <h2 style={{ marginTop: 0 }}>Analytics dos ultimos 30 dias</h2>
        {analytics ? (
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
              }}
            >
              <FinanceCard
                label="Consultas concluidas"
                amount={analytics.completed}
                detail={`${analytics.total} consultas no periodo`}
                countMode
              />
              <FinanceCard
                label="Canceladas"
                amount={analytics.cancelled}
                detail="monitorar perda de agenda"
                countMode
              />
              <FinanceCard
                label="No-show"
                amount={analytics.noShow}
                detail="faltas no periodo"
                countMode
              />
              <FinanceCard
                label="Receita recebida"
                amount={analytics.billingPaidCents}
                detail="cobrancas pagas no periodo"
              />
            </div>
            <div
              style={{
                display: "grid",
                gap: 18,
                gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)"
              }}
            >
              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0 }}>Serie diaria</h3>
                {analytics.periods.length > 0 ? (
                  analytics.periods.map((point) => (
                    <article
                      key={point.period}
                      style={{
                        borderRadius: 14,
                        border: "1px solid #d9e8f5",
                        padding: 14,
                        background: "#f8fbff",
                        display: "grid",
                        gap: 6
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {new Date(`${point.period}T12:00:00Z`).toLocaleDateString("pt-BR")}
                      </div>
                      <div style={{ color: "var(--muted)" }}>
                        {point.total} consultas | {point.completed} concluidas | {point.noShow} faltas
                      </div>
                      <div style={{ color: "var(--muted)" }}>
                        Receita:{" "}
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(point.paidCents / 100)}
                      </div>
                    </article>
                  ))
                ) : (
                  <div style={{ color: "var(--muted)" }}>
                    Ainda nao ha serie suficiente no periodo filtrado.
                  </div>
                )}
              </div>
              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0 }}>Profissionais</h3>
                {analytics.professionals.length > 0 ? (
                  analytics.professionals.map((professional) => (
                    <article
                      key={professional.professionalId}
                      style={{
                        borderRadius: 14,
                        border: "1px solid #d9e8f5",
                        padding: 14,
                        background: "#f8fbff",
                        display: "grid",
                        gap: 6
                      }}
                    >
                      <div style={{ fontWeight: 700 }}>
                        {professional.professionalName ?? professional.professionalId}
                      </div>
                      <div style={{ color: "var(--muted)" }}>
                        {professional.total} consultas | {professional.completed} concluidas |{" "}
                        {professional.noShow} faltas
                      </div>
                      <div style={{ color: "var(--muted)" }}>
                        Receita:{" "}
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(professional.paidCents / 100)}
                      </div>
                    </article>
                  ))
                ) : (
                  <div style={{ color: "var(--muted)" }}>
                    Nenhum profissional com eventos no periodo.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--muted)" }}>
            Nao foi possivel carregar os analytics operacionais.
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
        <h2 style={{ marginTop: 0 }}>Operacao externa</h2>
        {operations ? (
          <div style={{ display: "grid", gap: 18 }}>
            <div
              style={{
                borderRadius: 16,
                padding: 16,
                background:
                  operations.highestSeverity === "high"
                    ? "#fff1ef"
                    : operations.highestSeverity === "medium"
                      ? "#fff7e8"
                      : operations.highestSeverity === "low"
                        ? "#f5fbff"
                        : "#f7faf8",
                border:
                  operations.highestSeverity === "high"
                    ? "1px solid #f0c4bd"
                    : operations.highestSeverity === "medium"
                      ? "1px solid #f4d59a"
                      : operations.highestSeverity === "low"
                        ? "1px solid #d9e8f5"
                        : "1px solid #d9e8de"
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: 6 }}>
                Nivel de alerta: {operations.highestSeverity}
              </div>
              <div style={{ color: "var(--muted)" }}>
                {operations.alerts.length > 0
                  ? operations.alerts.map((alert) => `${alert.label} (${alert.count})`).join(" | ")
                  : "Nenhuma anomalia operacional relevante no momento."}
              </div>
            </div>
            <div
              style={{
                display: "grid",
                gap: 12,
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
              }}
            >
              <FinanceCard
                label="Lembretes com falha"
                amount={operations.failedReminders}
                detail="necessitam revisao operacional"
                countMode
              />
              <FinanceCard
                label="Retries aguardando"
                amount={operations.remindersAwaitingRetry}
                detail="com nova tentativa programada"
                countMode
              />
              <FinanceCard
                label="Webhooks falhos"
                amount={operations.webhookFailures}
                detail="eventos externos sem conciliacao"
                countMode
              />
              <FinanceCard
                label="Inbox pendente"
                amount={operations.pendingWebhookProcessing}
                detail="eventos recebidos e ainda nao fechados"
                countMode
              />
            </div>
            {operations.alerts.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                <h3 style={{ margin: 0 }}>Alertas operacionais</h3>
                {operations.alerts.map((alert) => (
                  <article
                    key={alert.code}
                    style={{
                      borderRadius: 14,
                      border: "1px solid #d9e8f5",
                      padding: 14,
                      background: "#f8fbff",
                      display: "grid",
                      gap: 6
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {alert.label} | severidade {alert.severity}
                    </div>
                    <div style={{ color: "var(--muted)" }}>{alert.detail}</div>
                    <div style={{ color: "var(--muted)" }}>Quantidade: {alert.count}</div>
                  </article>
                ))}
              </div>
            ) : null}
            <div style={{ display: "grid", gap: 10 }}>
              <h3 style={{ margin: 0 }}>Eventos recentes de cobranca</h3>
              {operations.recentWebhookEvents.length > 0 ? (
                operations.recentWebhookEvents.map((event) => (
                  <article
                    key={event.id}
                    style={{
                      borderRadius: 14,
                      border: "1px solid #d9e8f5",
                      padding: 14,
                      background: "#f8fbff",
                      display: "grid",
                      gap: 6
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      Cobranca {event.billingId} | {event.status}
                    </div>
                    <div style={{ color: "var(--muted)" }}>
                      Consulta {event.appointmentId}
                      {event.providerReference ? ` | ref ${event.providerReference}` : ""}
                      {event.eventId ? ` | evento ${event.eventId}` : ""}
                    </div>
                    <div style={{ color: "var(--muted)" }}>
                      Recebido em {new Date(event.createdAt).toLocaleString("pt-BR")}
                      {event.processedAt
                        ? ` | processado em ${new Date(event.processedAt).toLocaleString("pt-BR")}`
                        : " | aguardando processamento"}
                    </div>
                    <div style={{ fontWeight: 700 }}>
                      Resultado: {event.resultStatus ?? "pendente"}
                    </div>
                  </article>
                ))
              ) : (
                <div style={{ color: "var(--muted)" }}>
                  Nenhum evento externo de cobranca registrado ainda.
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--muted)" }}>
            Nao foi possivel carregar a operacao externa da agenda.
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
  detail,
  countMode
}: {
  label: string;
  amount: number;
  detail: string;
  countMode?: boolean;
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
        {countMode
          ? String(amount)
          : new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL"
            }).format(amount / 100)}
      </div>
      <div style={{ color: "var(--muted)", marginTop: 8 }}>{detail}</div>
    </article>
  );
}
