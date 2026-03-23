"use client";

import {
  ApiClient,
  type Appointment,
  type AppointmentBilling,
  type AppointmentReminder,
  type PatientSummary
} from "@receituario/api-client";
import { useMemo, useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

const statusOptions: Appointment["status"][] = [
  "scheduled",
  "confirmed",
  "checked_in",
  "completed",
  "cancelled",
  "no_show"
];

export function AgendaBoard({
  initialAppointments,
  patients
}: {
  initialAppointments: Appointment[];
  patients: PatientSummary[];
}) {
  const [appointments, setAppointments] = useState(initialAppointments);
  const [remindersByAppointment, setRemindersByAppointment] = useState<
    Record<string, AppointmentReminder[]>
  >({});
  const [billingByAppointment, setBillingByAppointment] = useState<
    Record<string, AppointmentBilling[]>
  >({});
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [title, setTitle] = useState("Consulta ambulatorial");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [telehealth, setTelehealth] = useState(false);
  const [billingAmount, setBillingAmount] = useState("25000");
  const [billingDescription, setBillingDescription] = useState("Consulta particular");
  const [reminderChannel, setReminderChannel] = useState<"email" | "sms" | "whatsapp">(
    "whatsapp"
  );
  const [reminderDateTime, setReminderDateTime] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<Appointment["status"] | "all">("all");
  const [modalityFilter, setModalityFilter] = useState<"all" | "telehealth" | "in_person">("all");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return appointments.filter((appointment) => {
      if (statusFilter !== "all" && appointment.status !== statusFilter) {
        return false;
      }

      if (modalityFilter === "telehealth" && !appointment.telehealth) {
        return false;
      }

      if (modalityFilter === "in_person" && appointment.telehealth) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [
        appointment.title,
        appointment.patientName,
        appointment.notes
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [appointments, modalityFilter, searchTerm, statusFilter]);

  const operationalSummary = useMemo(() => {
    return filteredAppointments.reduce(
      (acc, appointment) => {
        acc.total += 1;
        if (appointment.status === "scheduled") acc.scheduled += 1;
        if (appointment.status === "confirmed") acc.confirmed += 1;
        if (appointment.status === "completed") acc.completed += 1;
        if (appointment.telehealth) acc.telehealth += 1;

        const billingEntries =
          billingByAppointment[appointment.id] ?? appointment.billingEntries ?? [];

        for (const billingEntry of billingEntries) {
          if (billingEntry.status === "pending") {
            acc.pendingRevenueCents += billingEntry.amountCents;
          }
          if (billingEntry.status === "paid") {
            acc.paidRevenueCents += billingEntry.amountCents;
          }
        }

        return acc;
      },
      {
        total: 0,
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        telehealth: 0,
        pendingRevenueCents: 0,
        paidRevenueCents: 0
      }
    );
  }, [billingByAppointment, filteredAppointments]);

  async function createAppointment() {
    if (!patientId || !appointmentAt) {
      setMessage("Selecione o paciente e informe data/hora.");
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const created = await api.createAppointment({
        patientId,
        title,
        appointmentAt: new Date(appointmentAt).toISOString(),
        durationMinutes,
        notes: notes.trim() || undefined,
        telehealth
      });

      setAppointments((current) =>
        [...current, created].sort((left, right) =>
          left.appointmentAt.localeCompare(right.appointmentAt)
        )
      );
      setMessage("Consulta agendada com sucesso.");
      setNotes("");
      setTelehealth(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao agendar consulta.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(id: string, status: Appointment["status"]) {
    try {
      const api = createBrowserApiClient();
      const updated = await api.updateAppointmentStatus(id, { status });
      setAppointments((current) =>
        current.map((item) => (item.id === id ? updated : item))
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao atualizar status da consulta."
      );
    }
  }

  async function loadReminders(appointmentId: string) {
    try {
      const api = createBrowserApiClient();
      const reminders = await api.listAppointmentReminders(appointmentId);
      setRemindersByAppointment((current) => ({
        ...current,
        [appointmentId]: reminders
      }));
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Falha ao carregar lembretes da consulta."
      );
    }
  }

  async function loadBilling(appointmentId: string) {
    try {
      const api = createBrowserApiClient();
      const entries = await api.listAppointmentBilling(appointmentId);
      setBillingByAppointment((current) => ({
        ...current,
        [appointmentId]: entries
      }));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao carregar cobrancas."
      );
    }
  }

  async function createReminder(appointmentId: string) {
    if (!reminderDateTime) {
      setMessage("Informe data e hora do lembrete.");
      return;
    }

    try {
      const api = createBrowserApiClient();
      const reminder = await api.createAppointmentReminder(appointmentId, {
        channel: reminderChannel,
        scheduledFor: new Date(reminderDateTime).toISOString()
      });
      setRemindersByAppointment((current) => ({
        ...current,
        [appointmentId]: [...(current[appointmentId] ?? []), reminder]
      }));
      setMessage("Lembrete agendado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao agendar lembrete."
      );
    }
  }

  async function sendReminder(appointmentId: string, reminderId: string) {
    try {
      const api = createBrowserApiClient();
      const sent = await api.sendAppointmentReminder(appointmentId, reminderId);
      setRemindersByAppointment((current) => ({
        ...current,
        [appointmentId]: (current[appointmentId] ?? []).map((item) =>
          item.id === reminderId ? sent : item
        )
      }));
      setMessage("Lembrete enviado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao enviar lembrete."
      );
    }
  }

  async function retryReminder(appointmentId: string, reminderId: string) {
    try {
      const api = createBrowserApiClient();
      const retried = await api.retryAppointmentReminder(appointmentId, reminderId);
      setRemindersByAppointment((current) => ({
        ...current,
        [appointmentId]: (current[appointmentId] ?? []).map((item) =>
          item.id === reminderId ? retried : item
        )
      }));
      setMessage(
        retried.status === "sent"
          ? "Lembrete reenviado."
          : "Reenvio registrado com nova tentativa."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao reenviar lembrete."
      );
    }
  }

  async function createBilling(appointmentId: string) {
    const amountCents = Number(billingAmount);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setMessage("Informe um valor valido em centavos.");
      return;
    }

    try {
      const api = createBrowserApiClient();
      const created = await api.createAppointmentBilling(appointmentId, {
        amountCents,
        description: billingDescription,
        paymentProvider: "manual"
      });
      setBillingByAppointment((current) => ({
        ...current,
        [appointmentId]: [created, ...(current[appointmentId] ?? [])]
      }));
      setMessage("Cobranca registrada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao criar cobranca."
      );
    }
  }

  async function authorizeBilling(appointmentId: string, billingId: string) {
    try {
      const api = createBrowserApiClient();
      const updated = await api.authorizeAppointmentBilling(appointmentId, billingId);
      setBillingByAppointment((current) => ({
        ...current,
        [appointmentId]: (current[appointmentId] ?? []).map((entry) =>
          entry.id === billingId ? updated : entry
        )
      }));
      setMessage("Cobranca autorizada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao autorizar cobranca."
      );
    }
  }

  async function payBilling(appointmentId: string, billingId: string) {
    try {
      const api = createBrowserApiClient();
      const updated = await api.markAppointmentBillingPaid(appointmentId, billingId);
      setBillingByAppointment((current) => ({
        ...current,
        [appointmentId]: (current[appointmentId] ?? []).map((entry) =>
          entry.id === billingId ? updated : entry
        )
      }));
      setMessage("Cobranca marcada como paga.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao registrar pagamento."
      );
    }
  }

  async function createBillingCheckout(appointmentId: string, billingId: string) {
    try {
      const api = createBrowserApiClient();
      const updated = await api.createAppointmentBillingCheckout(appointmentId, billingId);
      setBillingByAppointment((current) => ({
        ...current,
        [appointmentId]: (current[appointmentId] ?? []).map((entry) =>
          entry.id === billingId ? updated : entry
        )
      }));
      setMessage("Checkout de pagamento gerado.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao gerar checkout."
      );
    }
  }

  async function reconcileBilling(
    appointmentId: string,
    billingId: string,
    status: "authorized" | "paid" | "cancelled" | "refunded"
  ) {
    try {
      const api = createBrowserApiClient();
      const updated = await api.reconcileAppointmentBilling(appointmentId, billingId, {
        status
      });
      setBillingByAppointment((current) => ({
        ...current,
        [appointmentId]: (current[appointmentId] ?? []).map((entry) =>
          entry.id === billingId ? updated : entry
        )
      }));
      setMessage("Cobranca conciliada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao conciliar cobranca."
      );
    }
  }

  async function createTelehealthRoom(appointmentId: string) {
    try {
      const api = createBrowserApiClient();
      const updated = await api.createTelehealthRoom(appointmentId);
      setAppointments((current) =>
        current.map((item) => (item.id === appointmentId ? updated : item))
      );
      setMessage("Sala de teleconsulta provisionada.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha ao provisionar teleconsulta."
      );
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Nova consulta</h2>
        <div style={formGridStyle}>
          <label style={fieldStyle}>
            <span>Paciente</span>
            <select value={patientId} onChange={(event) => setPatientId(event.target.value)} style={inputStyle}>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patient.fullName}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span>Titulo</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span>Data e hora</span>
            <input type="datetime-local" value={appointmentAt} onChange={(event) => setAppointmentAt(event.target.value)} style={inputStyle} />
          </label>
          <label style={fieldStyle}>
            <span>Duracao</span>
            <input type="number" min={10} step={10} value={durationMinutes} onChange={(event) => setDurationMinutes(Number(event.target.value) || 30)} style={inputStyle} />
          </label>
          <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <span>Observacoes</span>
            <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} style={textareaStyle} />
          </label>
          <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="checkbox" checked={telehealth} onChange={(event) => setTelehealth(event.target.checked)} />
            <span>Teleconsulta</span>
          </label>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" onClick={createAppointment} disabled={saving} style={buttonStyle}>
            {saving ? "Agendando..." : "Agendar consulta"}
          </button>
          {message ? <span style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</span> : null}
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={{ marginTop: 0 }}>Agenda clinica</h2>
        <div style={metricsGridStyle}>
          <SummaryCard label="Consultas visiveis" value={String(operationalSummary.total)} />
          <SummaryCard label="Agendadas" value={String(operationalSummary.scheduled)} />
          <SummaryCard label="Confirmadas" value={String(operationalSummary.confirmed)} />
          <SummaryCard label="Teleconsulta" value={String(operationalSummary.telehealth)} />
          <SummaryCard
            label="Receita pendente"
            value={formatCurrency(operationalSummary.pendingRevenueCents, "BRL")}
          />
          <SummaryCard
            label="Receita paga"
            value={formatCurrency(operationalSummary.paidRevenueCents, "BRL")}
          />
        </div>
        <div style={filterBarStyle}>
          <label style={fieldStyle}>
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as Appointment["status"] | "all")
              }
              style={inputStyle}
            >
              <option value="all">Todos</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
          <label style={fieldStyle}>
            <span>Modalidade</span>
            <select
              value={modalityFilter}
              onChange={(event) =>
                setModalityFilter(
                  event.target.value as "all" | "telehealth" | "in_person"
                )
              }
              style={inputStyle}
            >
              <option value="all">Todas</option>
              <option value="telehealth">Teleconsulta</option>
              <option value="in_person">Presencial</option>
            </select>
          </label>
          <label style={{ ...fieldStyle, minWidth: 260, flex: 1 }}>
            <span>Buscar</span>
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Paciente, titulo ou observacoes"
              style={inputStyle}
            />
          </label>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((appointment) => (
              <article key={appointment.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 18 }}>{appointment.title}</div>
                    <div style={{ color: "var(--muted)" }}>
                      {appointment.patientName ?? appointment.patientId} |{" "}
                      {new Date(appointment.appointmentAt).toLocaleString("pt-BR")}
                    </div>
                    <div style={{ color: "var(--muted)" }}>
                      {appointment.telehealth ? "Teleconsulta" : "Presencial"} |{" "}
                      {appointment.durationMinutes} min
                    </div>
                    {appointment.telehealthUrl ? (
                      <a
                        href={appointment.telehealthUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--primary)", fontWeight: 700 }}
                      >
                        Abrir sala {appointment.telehealthProvider ?? "teleconsulta"}
                      </a>
                    ) : null}
                  </div>
                  <select
                    value={appointment.status}
                    onChange={(event) =>
                      updateStatus(appointment.id, event.target.value as Appointment["status"])
                    }
                    style={inputStyle}
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
                {appointment.notes ? (
                  <div style={{ marginTop: 10, color: "var(--muted)" }}>{appointment.notes}</div>
                ) : null}
                <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    {appointment.telehealth ? (
                      <button
                        type="button"
                        style={secondaryButtonStyle}
                        onClick={() => createTelehealthRoom(appointment.id)}
                      >
                        {appointment.telehealthUrl ? "Atualizar sala" : "Criar sala"}
                      </button>
                    ) : null}
                    <button type="button" style={secondaryButtonStyle} onClick={() => loadReminders(appointment.id)}>
                      Ver lembretes
                    </button>
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => loadBilling(appointment.id)}
                    >
                      Ver cobranca
                    </button>
                    <select
                      value={reminderChannel}
                      onChange={(event) =>
                        setReminderChannel(event.target.value as "email" | "sms" | "whatsapp")
                      }
                      style={inputStyle}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="sms">SMS</option>
                      <option value="email">E-mail</option>
                    </select>
                    <input
                      type="datetime-local"
                      value={reminderDateTime}
                      onChange={(event) => setReminderDateTime(event.target.value)}
                      style={inputStyle}
                    />
                    <button type="button" style={secondaryButtonStyle} onClick={() => createReminder(appointment.id)}>
                      Agendar lembrete
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                    <input
                      type="number"
                      min={1}
                      step={100}
                      value={billingAmount}
                      onChange={(event) => setBillingAmount(event.target.value)}
                      style={inputStyle}
                      placeholder="Valor em centavos"
                    />
                    <input
                      value={billingDescription}
                      onChange={(event) => setBillingDescription(event.target.value)}
                      style={inputStyle}
                      placeholder="Descricao da cobranca"
                    />
                    <button
                      type="button"
                      style={secondaryButtonStyle}
                      onClick={() => createBilling(appointment.id)}
                    >
                      Registrar cobranca
                    </button>
                  </div>
                  {(remindersByAppointment[appointment.id] ?? []).length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {(remindersByAppointment[appointment.id] ?? []).map((reminder) => (
                        <div key={reminder.id} style={reminderRowStyle}>
                          <div>
                            <strong>{reminder.channel}</strong> | {reminder.status} |{" "}
                            {new Date(reminder.scheduledFor).toLocaleString("pt-BR")}
                          </div>
                          <div style={{ color: "var(--muted)" }}>{reminder.target ?? "sem destino"}</div>
                          <div style={{ color: "var(--muted)" }}>
                            Tentativas: {reminder.attemptCount}
                            {reminder.nextAttemptAt
                              ? ` | proxima: ${new Date(reminder.nextAttemptAt).toLocaleString("pt-BR")}`
                              : ""}
                          </div>
                          {reminder.lastError ? (
                            <div style={{ color: "#a33a2f", fontWeight: 600 }}>
                              Ultimo erro: {reminder.lastError}
                            </div>
                          ) : null}
                          {reminder.status === "pending" ? (
                            <button
                              type="button"
                              style={secondaryButtonStyle}
                              onClick={() => sendReminder(appointment.id, reminder.id)}
                            >
                              Enviar agora
                            </button>
                          ) : null}
                          {reminder.status === "failed" ? (
                            <button
                              type="button"
                              style={secondaryButtonStyle}
                              onClick={() => retryReminder(appointment.id, reminder.id)}
                            >
                              Tentar novamente
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {(billingByAppointment[appointment.id] ?? []).length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {(billingByAppointment[appointment.id] ?? []).map((entry) => (
                        <div key={entry.id} style={reminderRowStyle}>
                          <div>
                            <strong>{formatCurrency(entry.amountCents, entry.currency)}</strong> |{" "}
                            {entry.status} | {entry.description}
                          </div>
                          <div style={{ color: "var(--muted)" }}>
                            {entry.paymentProvider ?? "manual"}
                            {entry.externalReference ? ` | ref ${entry.externalReference}` : ""}
                          </div>
                          {entry.checkoutUrl ? (
                            <a
                              href={entry.checkoutUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "var(--primary)", fontWeight: 700 }}
                            >
                              Abrir checkout
                            </a>
                          ) : null}
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                            {entry.status === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  style={secondaryButtonStyle}
                                  onClick={() => createBillingCheckout(appointment.id, entry.id)}
                                >
                                  Gerar checkout
                                </button>
                                <button
                                  type="button"
                                  style={secondaryButtonStyle}
                                  onClick={() => authorizeBilling(appointment.id, entry.id)}
                                >
                                  Autorizar
                                </button>
                                <button
                                  type="button"
                                  style={secondaryButtonStyle}
                                  onClick={() => reconcileBilling(appointment.id, entry.id, "paid")}
                                >
                                  Conciliar pago
                                </button>
                              </>
                            ) : null}
                            {entry.status === "authorized" ? (
                              <>
                                <button
                                  type="button"
                                  style={secondaryButtonStyle}
                                  onClick={() => createBillingCheckout(appointment.id, entry.id)}
                                >
                                  Atualizar checkout
                                </button>
                                <button
                                  type="button"
                                  style={secondaryButtonStyle}
                                  onClick={() => payBilling(appointment.id, entry.id)}
                                >
                                  Marcar pago
                                </button>
                              </>
                            ) : null}
                            {(entry.status === "pending" || entry.status === "authorized") ? (
                              <button
                                type="button"
                                style={secondaryButtonStyle}
                                onClick={() => reconcileBilling(appointment.id, entry.id, "cancelled")}
                              >
                                Cancelar
                              </button>
                            ) : null}
                            {entry.status === "paid" ? (
                              <button
                                type="button"
                                style={secondaryButtonStyle}
                                onClick={() => reconcileBilling(appointment.id, entry.id, "refunded")}
                              >
                                Estornar
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div style={{ color: "var(--muted)" }}>
              Nenhuma consulta encontrada para os filtros atuais.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function formatCurrency(amountCents: number, currency: string) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency
  }).format(amountCents / 100);
}

function createBrowserApiClient() {
  const baseUrl = getBrowserApiBaseUrl();
  const accessToken = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("receituario_access_token="))
    ?.split("=")[1];

  return new ApiClient(baseUrl, accessToken ? decodeURIComponent(accessToken) : undefined);
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={summaryCardStyle}>
      <div style={{ color: "var(--muted)", fontSize: 14 }}>{label}</div>
      <strong style={{ fontSize: 24 }}>{value}</strong>
    </div>
  );
}

const panelStyle = {
  background: "white",
  padding: 24,
  borderRadius: 20,
  boxShadow: "0 18px 40px rgba(15, 64, 128, 0.08)",
  display: "grid",
  gap: 16
};

const formGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))"
};

const metricsGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))"
};

const filterBarStyle = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  alignItems: "end"
};

const fieldStyle = {
  display: "grid",
  gap: 8
};

const inputStyle = {
  width: "100%",
  borderRadius: 14,
  border: "1px solid #d4e1ef",
  padding: "12px 14px",
  fontSize: 15,
  fontFamily: "inherit"
};

const textareaStyle = {
  ...inputStyle,
  minHeight: 88,
  resize: "vertical" as const
};

const buttonStyle = {
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "white",
  padding: "12px 18px",
  cursor: "pointer"
};

const secondaryButtonStyle = {
  ...buttonStyle,
  background: "#dbeaf9",
  color: "#0d3b72"
};

const cardStyle = {
  borderRadius: 16,
  border: "1px solid #d4e1ef",
  padding: 18,
  background: "#f8fbff"
};

const summaryCardStyle = {
  borderRadius: 16,
  border: "1px solid #d4e1ef",
  padding: 16,
  background: "#f5faff",
  display: "grid",
  gap: 6
};

const reminderRowStyle = {
  borderRadius: 12,
  border: "1px solid #d4e1ef",
  padding: 12,
  display: "grid",
  gap: 6,
  background: "white"
};
