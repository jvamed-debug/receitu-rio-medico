"use client";

import { ApiClient } from "@receituario/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("profissional.demo@receituario.local");
  const [password, setPassword] = useState("demo123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get("redirect") || "/dashboard";

    try {
      const baseUrl = getBrowserApiBaseUrl();
      const api = new ApiClient(baseUrl);
      const tokens = await api.login({ email, password });
      const me = await new ApiClient(baseUrl, tokens.accessToken).me();

      document.cookie = `receituario_access_token=${encodeURIComponent(tokens.accessToken)}; path=/; max-age=${tokens.expiresIn}; samesite=lax`;
      document.cookie = `receituario_refresh_token=${encodeURIComponent(tokens.refreshToken)}; path=/; max-age=1296000; samesite=lax`;
      document.cookie = `receituario_user=${encodeURIComponent(me.email ?? email)}; path=/; max-age=${tokens.expiresIn}; samesite=lax`;

      router.push(redirectTo);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Falha ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
      <input
        placeholder="E-mail profissional"
        style={inputStyle}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <input
        placeholder="Senha"
        type="password"
        style={inputStyle}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
      <button type="submit" style={buttonStyle} disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}

const inputStyle = {
  borderRadius: 14,
  border: "1px solid #d8e2dc",
  padding: "14px 16px",
  fontSize: 16,
  background: "#fff"
};

const buttonStyle = {
  borderRadius: 14,
  border: 0,
  background: "var(--primary)",
  color: "white",
  padding: "14px 16px",
  fontSize: 16,
  cursor: "pointer"
};
