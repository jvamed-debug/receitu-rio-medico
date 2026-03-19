import type { ReactNode } from "react";

export function PageSection({
  title,
  description,
  children
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <section
      style={{
        background: "white",
        padding: 24,
        borderRadius: 20,
        boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)"
      }}
    >
      <div style={{ marginBottom: children ? 16 : 0 }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {description ? (
          <p style={{ marginBottom: 0, color: "var(--muted)" }}>{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}
