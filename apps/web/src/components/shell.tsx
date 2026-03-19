import type { ReactNode } from "react";

import { LogoutButton } from "./auth/logout-button";

const navItems = [
  ["Dashboard", "/dashboard"],
  ["Novo documento", "/documents/new"],
  ["Prescricoes", "/prescriptions/new"],
  ["Exames", "/exam-requests/new"],
  ["Atestados", "/certificates/new"],
  ["Documento livre", "/free-documents/new"],
  ["Templates", "/templates"],
  ["Pacientes", "/patients"],
  ["Historico", "/history"],
  ["PDF", "/pdf-preview"],
  ["Envio", "/delivery"],
  ["Configuracoes", "/settings"]
] as const;

export function Shell({
  title,
  subtitle,
  children,
  actions
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <main style={{ display: "grid", gridTemplateColumns: "280px 1fr" }}>
      <aside
        style={{
          minHeight: "100vh",
          background:
            "radial-gradient(circle at top, rgba(21, 96, 189, 0.92), rgba(8, 39, 88, 0.98) 68%)",
          color: "#f5f9ff",
          padding: "32px 24px",
          position: "sticky",
          top: 0
        }}
      >
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 14, opacity: 0.74 }}>Receituario Medico</div>
          <div style={{ fontSize: 28, marginTop: 8 }}>Blue Care</div>
          <p style={{ opacity: 0.78, lineHeight: 1.5 }}>
            Operacao clinica com assinatura, PDF e historico auditavel.
          </p>
        </div>
        <nav style={{ display: "grid", gap: 10 }}>
          {navItems.map(([label, href]) => (
            <a
              key={href}
              href={href}
              style={{
                padding: "12px 14px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(173, 216, 255, 0.14)"
              }}
            >
              {label}
            </a>
          ))}
        </nav>
      </aside>
      <section style={{ padding: "40px 48px" }}>
        <header
          style={{
            marginBottom: 32,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: 40 }}>{title}</h1>
            <p style={{ color: "var(--muted)", maxWidth: 760 }}>{subtitle}</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {actions}
            <LogoutButton />
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
