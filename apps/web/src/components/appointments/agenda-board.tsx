"use client";

import {
  ApiClient,
  type Appointment,
  type AppointmentReminder,
  type PatientSummary
} from "@receituario/api-client";
import { useState } from "react";

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
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [title, setTitle] = useState("Consulta ambulatorial");
  const [appointmentAt, setAppointmentAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [notes, setNotes] = useState("");
  const [telehealth, setTelehealth] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<"email" | "sms" | "whatsapp">(
    "whatsapp"
  );
  const [reminderDateTime, setReminderDateTime] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

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
        <div style={{ display: "grid", gap: 12 }}>
          {appointments.length > 0 ? (
            appointments.map((appointment) => (
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
                    <button type="button" style={secondaryButtonStyle} onClick={() => loadReminders(appointment.id)}>
                      Ver lembretes
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
                  {(remindersByAppointment[appointment.id] ?? []).length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {(remindersByAppointment[appointment.id] ?? []).map((reminder) => (
                        <div key={reminder.id} style={reminderRowStyle}>
                          <div>
                            <strong>{reminder.channel}</strong> | {reminder.status} |{" "}
                            {new Date(reminder.scheduledFor).toLocaleString("pt-BR")}
                          </div>
                          <div style={{ color: "var(--muted)" }}>{reminder.target ?? "sem destino"}</div>
                          {reminder.status === "pending" ? (
                            <button
                              type="button"
                              style={secondaryButtonStyle}
                              onClick={() => sendReminder(appointment.id, reminder.id)}
                            >
                              Enviar agora
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <div style={{ color: "var(--muted)" }}>
              Nenhuma consulta agendada ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function createBrowserApiClient() {
  const baseUrl = getBrowserApiBaseUrl();
  const accessToken = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("receituario_access_token="))
    ?.split("=")[1];

  return new ApiClient(baseUrl, accessToken ? decodeURIComponent(accessToken) : undefined);
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

const reminderRowStyle = {
  borderRadius: 12,
  border: "1px solid #d4e1ef",
  padding: 12,
  display: "grid",
  gap: 6,
  background: "white"
};
