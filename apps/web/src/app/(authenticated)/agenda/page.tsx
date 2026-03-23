import { AgendaBoard } from "../../../components/appointments/agenda-board";
import { Shell } from "../../../components/shell";
import { createServerApiClient } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function AgendaPage() {
  const api = await createServerApiClient();
  const [appointments, patients] = await Promise.all([
    api.listAppointments().catch(() => []),
    api.listPatients().catch(() => [])
  ]);

  return (
    <Shell
      title="Agenda clinica"
      subtitle="Consultas presenciais e teleatendimentos organizados no mesmo fluxo do prontuario."
    >
      <AgendaBoard initialAppointments={appointments} patients={patients} />
    </Shell>
  );
}
