"use client";

import {
  ApiClient,
  type OrganizationDetail,
  type OrganizationMembershipSummary,
  type OrganizationSummary
} from "@receituario/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

export function OrganizationGovernancePanel({
  currentOrganization,
  organizations,
  initialMemberships
}: {
  currentOrganization: OrganizationDetail | null;
  organizations: OrganizationSummary[];
  initialMemberships: OrganizationMembershipSummary[];
}) {
  const router = useRouter();
  const [memberships, setMemberships] = useState(initialMemberships);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    currentOrganization?.id ?? organizations[0]?.id ?? ""
  );
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSwitchOrganization() {
    if (!selectedOrganizationId) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const tokens = await api.switchOrganization(selectedOrganizationId);
      const me = await new ApiClient(getBrowserApiBaseUrl(), tokens.accessToken).me();

      document.cookie = `receituario_access_token=${encodeURIComponent(tokens.accessToken)}; path=/; max-age=${tokens.expiresIn}; samesite=lax`;
      document.cookie = `receituario_refresh_token=${encodeURIComponent(tokens.refreshToken)}; path=/; max-age=1296000; samesite=lax`;
      document.cookie = `receituario_user=${encodeURIComponent(me.email ?? "")}; path=/; max-age=${tokens.expiresIn}; samesite=lax`;

      setMessage("Organizacao ativa atualizada.");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao trocar organizacao ativa."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMembership() {
    if (!memberEmail.trim()) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const created = await api.addOrganizationMembershipByEmail({
        email: memberEmail.trim(),
        membershipRole: memberRole
      });

      setMemberships((current) => [created, ...current]);
      setMemberEmail("");
      setMessage("Membership adicionada com sucesso.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao adicionar membership."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePromoteMembership(membershipId: string, membershipRole: string) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const nextRole = membershipRole === "member" ? "admin" : "member";
      const updated = await api.updateOrganizationMembership(membershipId, {
        membershipRole: nextRole
      });

      setMemberships((current) =>
        current.map((membership) => (membership.id === membershipId ? updated : membership))
      );
      setMessage("Membership atualizada.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao atualizar membership."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Contexto institucional</h2>
        {currentOrganization ? (
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <strong>{currentOrganization.name}</strong> | slug {currentOrganization.slug}
            </div>
            <div style={{ color: "var(--muted)" }}>
              Papel atual: {currentOrganization.membershipRole ?? "member"} | membros:{" "}
              {currentOrganization.memberCount} | perfis principais:{" "}
              {currentOrganization.professionalCount}
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--muted)" }}>
            Nenhuma organizacao ativa vinculada ao perfil atual.
          </div>
        )}
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Trocar organizacao ativa</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={fieldStyle}>
            <span>Organizacao</span>
            <select
              value={selectedOrganizationId}
              onChange={(event) => setSelectedOrganizationId(event.target.value)}
              style={inputStyle}
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={handleSwitchOrganization} disabled={saving} style={buttonStyle}>
            {saving ? "Atualizando..." : "Trocar organizacao"}
          </button>
        </div>
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Memberships da organizacao ativa</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={fieldStyle}>
            <span>E-mail do profissional</span>
            <input
              value={memberEmail}
              onChange={(event) => setMemberEmail(event.target.value)}
              style={inputStyle}
              placeholder="profissional@clinica.com"
            />
          </label>
          <label style={fieldStyle}>
            <span>Papel</span>
            <select
              value={memberRole}
              onChange={(event) => setMemberRole(event.target.value)}
              style={inputStyle}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
          </label>
          <button type="button" onClick={handleAddMembership} disabled={saving} style={buttonStyle}>
            Adicionar membership
          </button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {memberships.length > 0 ? (
            memberships.map((membership) => (
              <article key={membership.id} style={membershipCardStyle}>
                <div>
                  <div style={{ fontWeight: 700 }}>{membership.professionalName}</div>
                  <div style={{ color: "var(--muted)" }}>
                    {membership.professionalEmail} | papel {membership.membershipRole}
                    {membership.isDefault ? " | organizacao padrao" : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    handlePromoteMembership(membership.id, membership.membershipRole)
                  }
                  style={secondaryButtonStyle}
                  disabled={saving || membership.membershipRole === "owner"}
                >
                  {membership.membershipRole === "member" ? "Promover para admin" : "Rebaixar para member"}
                </button>
              </article>
            ))
          ) : (
            <div style={{ color: "var(--muted)" }}>
              Nenhuma membership carregada para a organizacao atual.
            </div>
          )}
        </div>

        {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
        {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}
      </section>
    </div>
  );
}

function createBrowserApiClient() {
  const accessToken = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith("receituario_access_token="))
    ?.split("=")[1];

  return new ApiClient(
    getBrowserApiBaseUrl(),
    accessToken ? decodeURIComponent(accessToken) : undefined
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

const fieldStyle = {
  display: "grid",
  gap: 8
};

const inputStyle = {
  borderRadius: 14,
  border: "1px solid #d4e1ef",
  padding: "12px 14px",
  fontSize: 15,
  fontFamily: "inherit"
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

const membershipCardStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  borderRadius: 14,
  border: "1px solid #d4e1ef",
  padding: 14,
  background: "#f8fbff"
};
