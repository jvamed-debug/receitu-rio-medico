"use client";

export default function AuthenticatedError({
  error,
  reset
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: 20,
        padding: 24,
        boxShadow: "0 18px 40px rgba(16, 36, 24, 0.08)"
      }}
    >
      <h2 style={{ marginTop: 0 }}>Falha ao carregar a area autenticada</h2>
      <p style={{ color: "var(--muted)" }}>{error.message}</p>
      <button
        type="button"
        onClick={reset}
        style={{
          borderRadius: 14,
          border: 0,
          background: "var(--primary)",
          color: "white",
          padding: "12px 16px",
          cursor: "pointer"
        }}
      >
        Tentar novamente
      </button>
    </div>
  );
}
