import { Shell } from "../../../components/shell";
import { createApiClient } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function loadPatients() {
  const api = createApiClient();

  try {
    return await api.listPatients();
  } catch {
    return [];
  }
}

export default async function PatientsPage() {
  const patients = await loadPatients();

  return (
    <Shell
      title="Pacientes"
      subtitle="Busca, cadastro e linha do tempo clinica por paciente."
    >
      <div style={{ display: "grid", gap: 16 }}>
        <section style={{ background: "white", padding: 24, borderRadius: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16
            }}
          >
            <div>
              <h2 style={{ margin: 0 }}>Base de pacientes</h2>
              <p style={{ color: "var(--muted)" }}>
                {patients.length} paciente(s) carregado(s) da API inicial do MVP.
              </p>
            </div>
            <a
              href="/documents"
              style={{
                display: "inline-block",
                background: "var(--primary)",
                color: "white",
                padding: "12px 18px",
                borderRadius: 14
              }}
            >
              Novo documento
            </a>
          </div>
        </section>

        <section style={{ display: "grid", gap: 12 }}>
          {patients.length > 0 ? (
            patients.map((patient) => (
              <article
                key={patient.id}
                style={{
                  background: "white",
                  padding: 20,
                  borderRadius: 18,
                  boxShadow: "0 12px 30px rgba(16, 36, 24, 0.08)"
                }}
              >
                <div style={{ fontSize: 22, fontWeight: 700 }}>{patient.fullName}</div>
                <div style={{ marginTop: 8, color: "var(--muted)" }}>
                  CPF: {patient.cpf ?? "nao informado"} | CNS: {patient.cns ?? "nao informado"}
                </div>
                <div style={{ marginTop: 16 }}>
                  <a
                    href={`/patients/${patient.id}`}
                    style={{
                      display: "inline-block",
                      background: "var(--primary)",
                      color: "white",
                      padding: "10px 14px",
                      borderRadius: 12
                    }}
                  >
                    Abrir perfil
                  </a>
                </div>
              </article>
            ))
          ) : (
            <div style={{ background: "white", padding: 24, borderRadius: 20 }}>
              Nenhum paciente disponivel ainda. Assim que a API estiver de pe e o seed rodar, esta lista aparece aqui.
            </div>
          )}
        </section>
      </div>
    </Shell>
  );
}
