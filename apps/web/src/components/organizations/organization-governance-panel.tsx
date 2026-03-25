"use client";

import {
  ApiClient,
  type OrganizationDetail,
  type OrganizationInvitationSummary,
  type OrganizationMembershipSummary,
  type OrganizationSettings,
  type OrganizationSummary
} from "@receituario/api-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { getBrowserApiBaseUrl } from "../../lib/browser-api";

const documentPolicyLabels: Record<
  "prescription" | "exam-request" | "medical-certificate" | "free-document",
  string
> = {
  prescription: "Prescricao",
  "exam-request": "Solicitacao de exames",
  "medical-certificate": "Atestado medico",
  "free-document": "Documento livre"
};

function buildDefaultDocumentPolicyMatrix(
  settings?: OrganizationSettings
): NonNullable<OrganizationSettings["documentPolicyMatrix"]> {
  return {
    prescription: {
      allowExternalShare: settings?.documentPolicyMatrix?.prescription?.allowExternalShare ?? true,
      requireRqe: settings?.documentPolicyMatrix?.prescription?.requireRqe ?? false,
      minimumShareRole:
        settings?.documentPolicyMatrix?.prescription?.minimumShareRole ?? "professional",
      requirePatientConsentForExternalShare:
        settings?.documentPolicyMatrix?.prescription?.requirePatientConsentForExternalShare ?? false,
      shareLinkTtlHours: settings?.documentPolicyMatrix?.prescription?.shareLinkTtlHours ?? 24,
      shareLinkMaxUses: settings?.documentPolicyMatrix?.prescription?.shareLinkMaxUses ?? 3
    },
    "exam-request": {
      allowExternalShare:
        settings?.documentPolicyMatrix?.["exam-request"]?.allowExternalShare ?? true,
      requireRqe: settings?.documentPolicyMatrix?.["exam-request"]?.requireRqe ?? false,
      minimumShareRole:
        settings?.documentPolicyMatrix?.["exam-request"]?.minimumShareRole ?? "professional",
      requirePatientConsentForExternalShare:
        settings?.documentPolicyMatrix?.["exam-request"]?.requirePatientConsentForExternalShare ??
        false,
      shareLinkTtlHours:
        settings?.documentPolicyMatrix?.["exam-request"]?.shareLinkTtlHours ?? 72,
      shareLinkMaxUses: settings?.documentPolicyMatrix?.["exam-request"]?.shareLinkMaxUses ?? 5
    },
    "medical-certificate": {
      allowExternalShare:
        settings?.documentPolicyMatrix?.["medical-certificate"]?.allowExternalShare ?? true,
      requireRqe:
        settings?.documentPolicyMatrix?.["medical-certificate"]?.requireRqe ?? false,
      minimumShareRole:
        settings?.documentPolicyMatrix?.["medical-certificate"]?.minimumShareRole ??
        "professional",
      requirePatientConsentForExternalShare:
        settings?.documentPolicyMatrix?.["medical-certificate"]?.requirePatientConsentForExternalShare ??
        true,
      shareLinkTtlHours:
        settings?.documentPolicyMatrix?.["medical-certificate"]?.shareLinkTtlHours ?? 48,
      shareLinkMaxUses:
        settings?.documentPolicyMatrix?.["medical-certificate"]?.shareLinkMaxUses ?? 3
    },
    "free-document": {
      allowExternalShare:
        settings?.documentPolicyMatrix?.["free-document"]?.allowExternalShare ?? false,
      requireRqe: settings?.documentPolicyMatrix?.["free-document"]?.requireRqe ?? false,
      minimumShareRole:
        settings?.documentPolicyMatrix?.["free-document"]?.minimumShareRole ?? "admin",
      requirePatientConsentForExternalShare:
        settings?.documentPolicyMatrix?.["free-document"]?.requirePatientConsentForExternalShare ??
        true,
      shareLinkTtlHours:
        settings?.documentPolicyMatrix?.["free-document"]?.shareLinkTtlHours ?? 12,
      shareLinkMaxUses: settings?.documentPolicyMatrix?.["free-document"]?.shareLinkMaxUses ?? 1
    }
  };
}

function buildDefaultLgpdPolicy(settings?: OrganizationSettings) {
  return {
    requireConsentForExternalShare:
      settings?.lgpdPolicy?.requireConsentForExternalShare ?? false,
    requireDisposalApproval: settings?.lgpdPolicy?.requireDisposalApproval ?? true,
    retentionReviewWindowDays: settings?.lgpdPolicy?.retentionReviewWindowDays ?? 30
  };
}

export function OrganizationGovernancePanel({
  currentOrganization,
  organizations,
  initialMemberships,
  initialInvitations
}: {
  currentOrganization: OrganizationDetail | null;
  organizations: OrganizationSummary[];
  initialMemberships: OrganizationMembershipSummary[];
  initialInvitations: OrganizationInvitationSummary[];
}) {
  const router = useRouter();
  const [memberships, setMemberships] = useState(initialMemberships);
  const [invitations, setInvitations] = useState(initialInvitations);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(
    currentOrganization?.id ?? organizations[0]?.id ?? ""
  );
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState("member");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteExpirationHours, setInviteExpirationHours] = useState("168");
  const [settings, setSettings] = useState<OrganizationSettings>({
    documentSharePolicy: {
      maxUsesDefault: currentOrganization?.settings?.documentSharePolicy.maxUsesDefault ?? 3,
      expirationHoursDefault:
        currentOrganization?.settings?.documentSharePolicy.expirationHoursDefault ?? 72,
      allowHighRiskExternalShare:
        currentOrganization?.settings?.documentSharePolicy.allowHighRiskExternalShare ?? false
    },
    overridePolicy: {
      minimumReviewerRole:
        currentOrganization?.settings?.overridePolicy.minimumReviewerRole ?? "compliance",
      requireInstitutionalReviewForHighSeverity:
        currentOrganization?.settings?.overridePolicy.requireInstitutionalReviewForHighSeverity ??
        true,
      requireInstitutionalReviewForModerateInteraction:
        currentOrganization?.settings?.overridePolicy.requireInstitutionalReviewForModerateInteraction ??
        true,
      autoAcknowledgePrivilegedOverride:
        currentOrganization?.settings?.overridePolicy.autoAcknowledgePrivilegedOverride ?? true
    },
    brandingPolicy: {
      allowCustomLogo: currentOrganization?.settings?.brandingPolicy.allowCustomLogo ?? false,
      lockedLayoutVersion:
        currentOrganization?.settings?.brandingPolicy.lockedLayoutVersion ?? ""
    },
    documentPolicyMatrix: buildDefaultDocumentPolicyMatrix(currentOrganization?.settings),
    lgpdPolicy: buildDefaultLgpdPolicy(currentOrganization?.settings)
  });
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

  async function handleMembershipLifecycle(
    membershipId: string,
    input: {
      status?: "active" | "suspended" | "removed";
      isDefault?: boolean;
    }
  ) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const updated = await api.updateOrganizationMembership(membershipId, input);

      setMemberships((current) =>
        current.map((membership) => (membership.id === membershipId ? updated : membership))
      );
      setMessage("Lifecycle da membership atualizado.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao atualizar lifecycle da membership."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInvitation() {
    if (!inviteEmail.trim()) {
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const expiresAt = new Date(
        Date.now() + (Number(inviteExpirationHours) || 168) * 60 * 60 * 1000
      ).toISOString();
      const created = await api.createOrganizationInvitation({
        email: inviteEmail.trim(),
        membershipRole: inviteRole,
        expiresAt
      });

      setInvitations((current) => [created, ...current]);
      setInviteEmail("");
      setMessage("Convite institucional criado.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao criar convite institucional."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRevokeInvitation(invitationId: string) {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const updated = await api.revokeOrganizationInvitation(invitationId);

      setInvitations((current) =>
        current.map((invitation) => (invitation.id === invitationId ? updated : invitation))
      );
      setMessage("Convite revogado.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao revogar convite."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const api = createBrowserApiClient();
      const updated = await api.updateCurrentOrganizationSettings({
        documentSharePolicy: {
          maxUsesDefault: settings.documentSharePolicy.maxUsesDefault,
          expirationHoursDefault: settings.documentSharePolicy.expirationHoursDefault,
          allowHighRiskExternalShare: settings.documentSharePolicy.allowHighRiskExternalShare
        },
        overridePolicy: {
          minimumReviewerRole: settings.overridePolicy.minimumReviewerRole,
          requireInstitutionalReviewForHighSeverity:
            settings.overridePolicy.requireInstitutionalReviewForHighSeverity,
          requireInstitutionalReviewForModerateInteraction:
            settings.overridePolicy.requireInstitutionalReviewForModerateInteraction,
          autoAcknowledgePrivilegedOverride:
            settings.overridePolicy.autoAcknowledgePrivilegedOverride
        },
        brandingPolicy: {
          allowCustomLogo: settings.brandingPolicy.allowCustomLogo,
          lockedLayoutVersion: settings.brandingPolicy.lockedLayoutVersion || undefined
        },
        documentPolicyMatrix: settings.documentPolicyMatrix,
        lgpdPolicy: settings.lgpdPolicy
      });

      setSettings({
        documentSharePolicy: {
          maxUsesDefault: updated.settings?.documentSharePolicy.maxUsesDefault ?? 3,
          expirationHoursDefault:
            updated.settings?.documentSharePolicy.expirationHoursDefault ?? 72,
          allowHighRiskExternalShare:
            updated.settings?.documentSharePolicy.allowHighRiskExternalShare ?? false
        },
        overridePolicy: {
          minimumReviewerRole:
            updated.settings?.overridePolicy.minimumReviewerRole ?? "compliance",
          requireInstitutionalReviewForHighSeverity:
            updated.settings?.overridePolicy.requireInstitutionalReviewForHighSeverity ?? true,
          requireInstitutionalReviewForModerateInteraction:
            updated.settings?.overridePolicy.requireInstitutionalReviewForModerateInteraction ??
            true,
          autoAcknowledgePrivilegedOverride:
            updated.settings?.overridePolicy.autoAcknowledgePrivilegedOverride ?? true
        },
        brandingPolicy: {
          allowCustomLogo: updated.settings?.brandingPolicy.allowCustomLogo ?? false,
          lockedLayoutVersion: updated.settings?.brandingPolicy.lockedLayoutVersion ?? ""
        },
        documentPolicyMatrix: buildDefaultDocumentPolicyMatrix(updated.settings),
        lgpdPolicy: buildDefaultLgpdPolicy(updated.settings)
      });

      setMessage("Politicas institucionais atualizadas.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Falha ao atualizar politicas da organizacao."
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
                    {membership.professionalEmail} | papel {membership.membershipRole} | status{" "}
                    {membership.status}
                    {membership.isDefault ? " | organizacao padrao" : ""}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() =>
                      handlePromoteMembership(membership.id, membership.membershipRole)
                    }
                    style={secondaryButtonStyle}
                    disabled={saving || membership.membershipRole === "owner"}
                  >
                    {membership.membershipRole === "member"
                      ? "Promover para admin"
                      : "Rebaixar para member"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleMembershipLifecycle(membership.id, {
                        status: membership.status === "active" ? "suspended" : "active"
                      })
                    }
                    style={secondaryButtonStyle}
                    disabled={saving || membership.membershipRole === "owner"}
                  >
                    {membership.status === "active" ? "Suspender" : "Reativar"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleMembershipLifecycle(membership.id, {
                        isDefault: true
                      })
                    }
                    style={secondaryButtonStyle}
                    disabled={saving || membership.status !== "active"}
                  >
                    Tornar padrao
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleMembershipLifecycle(membership.id, {
                        status: "removed"
                      })
                    }
                    style={dangerButtonStyle}
                    disabled={saving || membership.membershipRole === "owner"}
                  >
                    Remover
                  </button>
                </div>
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

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Convites institucionais</h2>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <label style={fieldStyle}>
            <span>E-mail convidado</span>
            <input
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              style={inputStyle}
              placeholder="novo@clinica.com"
            />
          </label>
          <label style={fieldStyle}>
            <span>Papel</span>
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value)}
              style={inputStyle}
            >
              <option value="member">member</option>
              <option value="admin">admin</option>
              <option value="owner">owner</option>
            </select>
          </label>
          <label style={fieldStyle}>
            <span>Expira em horas</span>
            <input
              type="number"
              min={1}
              max={720}
              value={inviteExpirationHours}
              onChange={(event) => setInviteExpirationHours(event.target.value)}
              style={inputStyle}
            />
          </label>
          <button type="button" onClick={handleCreateInvitation} disabled={saving} style={buttonStyle}>
            Criar convite
          </button>
        </div>

        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {invitations.length > 0 ? (
            invitations.map((invitation) => (
              <article key={invitation.id} style={membershipCardStyle}>
                <div>
                  <div style={{ fontWeight: 700 }}>{invitation.email}</div>
                  <div style={{ color: "var(--muted)" }}>
                    papel {invitation.membershipRole} | status {invitation.status}
                    {invitation.expiresAt
                      ? ` | expira em ${new Date(invitation.expiresAt).toLocaleString("pt-BR")}`
                      : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeInvitation(invitation.id)}
                  style={dangerButtonStyle}
                  disabled={saving || invitation.status !== "pending"}
                >
                  Revogar convite
                </button>
              </article>
            ))
          ) : (
            <div style={{ color: "var(--muted)" }}>
              Nenhum convite institucional carregado para a organizacao atual.
            </div>
          )}
        </div>

        {error ? <div style={{ color: "var(--danger)", fontWeight: 700 }}>{error}</div> : null}
        {message ? <div style={{ color: "var(--primary)", fontWeight: 700 }}>{message}</div> : null}
      </section>

      <section style={panelStyle}>
        <h2 style={{ margin: 0 }}>Politicas institucionais</h2>
        <div
          style={{
            display: "grid",
            gap: 18,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))"
          }}
        >
          <div style={policySectionStyle}>
            <h3 style={{ margin: 0 }}>Compartilhamento externo</h3>
            <label style={fieldStyle}>
              <span>Maximo de usos por link</span>
              <input
                type="number"
                min={1}
                max={20}
                value={settings.documentSharePolicy.maxUsesDefault}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    documentSharePolicy: {
                      ...current.documentSharePolicy,
                      maxUsesDefault: Number(event.target.value) || 1
                    }
                  }))
                }
                style={inputStyle}
              />
            </label>
            <label style={fieldStyle}>
              <span>Expiracao padrao do link em horas</span>
              <input
                type="number"
                min={1}
                max={168}
                value={settings.documentSharePolicy.expirationHoursDefault}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    documentSharePolicy: {
                      ...current.documentSharePolicy,
                      expirationHoursDefault: Number(event.target.value) || 1
                    }
                  }))
                }
                style={inputStyle}
              />
            </label>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={settings.documentSharePolicy.allowHighRiskExternalShare}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    documentSharePolicy: {
                      ...current.documentSharePolicy,
                      allowHighRiskExternalShare: event.target.checked
                    }
                  }))
                }
              />
              <span>Permitir compartilhamento externo de documentos de maior risco</span>
            </label>
          </div>

          <div style={policySectionStyle}>
            <h3 style={{ margin: 0 }}>Governanca clinica</h3>
            <label style={fieldStyle}>
              <span>Menor papel revisor para override critico</span>
              <select
                value={settings.overridePolicy.minimumReviewerRole}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    overridePolicy: {
                      ...current.overridePolicy,
                      minimumReviewerRole: event.target.value as
                        | "professional"
                        | "admin"
                        | "compliance"
                    }
                  }))
                }
                style={inputStyle}
              >
                <option value="professional">professional</option>
                <option value="admin">admin</option>
                <option value="compliance">compliance</option>
              </select>
            </label>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={settings.overridePolicy.requireInstitutionalReviewForHighSeverity}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    overridePolicy: {
                      ...current.overridePolicy,
                      requireInstitutionalReviewForHighSeverity: event.target.checked
                    }
                  }))
                }
              />
              <span>Exigir revisao institucional para alertas de alta severidade</span>
            </label>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={settings.overridePolicy.requireInstitutionalReviewForModerateInteraction}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    overridePolicy: {
                      ...current.overridePolicy,
                      requireInstitutionalReviewForModerateInteraction: event.target.checked
                    }
                  }))
                }
              />
              <span>Exigir revisao institucional para interacoes moderadas</span>
            </label>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={settings.overridePolicy.autoAcknowledgePrivilegedOverride}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    overridePolicy: {
                      ...current.overridePolicy,
                      autoAcknowledgePrivilegedOverride: event.target.checked
                    }
                  }))
                }
              />
              <span>Permitir auto-reconhecimento por perfil privilegiado</span>
            </label>
          </div>

          <div style={policySectionStyle}>
            <h3 style={{ margin: 0 }}>Branding e layout</h3>
            <label style={checkboxLabelStyle}>
              <input
                type="checkbox"
                checked={settings.brandingPolicy.allowCustomLogo}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    brandingPolicy: {
                      ...current.brandingPolicy,
                      allowCustomLogo: event.target.checked
                    }
                  }))
                }
              />
              <span>Permitir identidade visual propria da organizacao</span>
            </label>
            <label style={fieldStyle}>
              <span>Versao de layout travada</span>
              <input
                value={settings.brandingPolicy.lockedLayoutVersion}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    brandingPolicy: {
                      ...current.brandingPolicy,
                      lockedLayoutVersion: event.target.value
                    }
                  }))
                }
                placeholder="ex: v1-clinica-a"
                style={inputStyle}
              />
            </label>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>Matriz regulatoria por documento</h3>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
            {(Object.entries(documentPolicyLabels) as Array<
              [
                "prescription" | "exam-request" | "medical-certificate" | "free-document",
                string
              ]
            >).map(([documentType, label]) => {
              const policy = settings.documentPolicyMatrix?.[documentType];
              if (!policy) {
                return null;
              }

              return (
                <div key={documentType} style={policySectionStyle}>
                  <h3 style={{ margin: 0 }}>{label}</h3>
                  <label style={fieldStyle}>
                    <span>Papel minimo para compartilhamento</span>
                    <select
                      value={policy.minimumShareRole}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          documentPolicyMatrix: {
                            ...current.documentPolicyMatrix,
                            [documentType]: {
                              ...current.documentPolicyMatrix?.[documentType],
                              minimumShareRole: event.target.value as
                                | "professional"
                                | "admin"
                                | "compliance"
                            }
                          }
                        }))
                      }
                      style={inputStyle}
                    >
                      <option value="professional">professional</option>
                      <option value="admin">admin</option>
                      <option value="compliance">compliance</option>
                    </select>
                  </label>
                  <label style={fieldStyle}>
                    <span>TTL do link (horas)</span>
                    <input
                      type="number"
                      min={1}
                      value={policy.shareLinkTtlHours}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          documentPolicyMatrix: {
                            ...current.documentPolicyMatrix,
                            [documentType]: {
                              ...current.documentPolicyMatrix?.[documentType],
                              shareLinkTtlHours: Number(event.target.value) || 1
                            }
                          }
                        }))
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={fieldStyle}>
                    <span>Usos maximos do link</span>
                    <input
                      type="number"
                      min={1}
                      value={policy.shareLinkMaxUses}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          documentPolicyMatrix: {
                            ...current.documentPolicyMatrix,
                            [documentType]: {
                              ...current.documentPolicyMatrix?.[documentType],
                              shareLinkMaxUses: Number(event.target.value) || 1
                            }
                          }
                        }))
                      }
                      style={inputStyle}
                    />
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={policy.allowExternalShare}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          documentPolicyMatrix: {
                            ...current.documentPolicyMatrix,
                            [documentType]: {
                              ...current.documentPolicyMatrix?.[documentType],
                              allowExternalShare: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Permitir compartilhamento externo</span>
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={policy.requireRqe}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          documentPolicyMatrix: {
                            ...current.documentPolicyMatrix,
                            [documentType]: {
                              ...current.documentPolicyMatrix?.[documentType],
                              requireRqe: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Exigir RQE</span>
                  </label>
                  <label style={checkboxLabelStyle}>
                    <input
                      type="checkbox"
                      checked={policy.requirePatientConsentForExternalShare}
                      onChange={(event) =>
                        setSettings((current) => ({
                          ...current,
                          documentPolicyMatrix: {
                            ...current.documentPolicyMatrix,
                            [documentType]: {
                              ...current.documentPolicyMatrix?.[documentType],
                              requirePatientConsentForExternalShare: event.target.checked
                            }
                          }
                        }))
                      }
                    />
                    <span>Exigir consentimento do paciente</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <h3 style={{ margin: 0 }}>LGPD operacional</h3>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
            }}
          >
            <div style={policySectionStyle}>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.lgpdPolicy?.requireConsentForExternalShare ?? false}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      lgpdPolicy: {
                        ...current.lgpdPolicy,
                        requireConsentForExternalShare: event.target.checked
                      }
                    }))
                  }
                />
                <span>Exigir consentimento para compartilhamento externo</span>
              </label>
              <label style={checkboxLabelStyle}>
                <input
                  type="checkbox"
                  checked={settings.lgpdPolicy?.requireDisposalApproval ?? true}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      lgpdPolicy: {
                        ...current.lgpdPolicy,
                        requireDisposalApproval: event.target.checked
                      }
                    }))
                  }
                />
                <span>Exigir aprovacao para descarte documental</span>
              </label>
              <label style={fieldStyle}>
                <span>Janela de review de retencao (dias)</span>
                <input
                  type="number"
                  min={1}
                  value={settings.lgpdPolicy?.retentionReviewWindowDays ?? 30}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      lgpdPolicy: {
                        ...current.lgpdPolicy,
                        retentionReviewWindowDays: Number(event.target.value) || 1
                      }
                    }))
                  }
                  style={inputStyle}
                />
              </label>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button" onClick={handleSaveSettings} disabled={saving} style={buttonStyle}>
            {saving ? "Salvando..." : "Salvar politicas"}
          </button>
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

const checkboxLabelStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center"
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

const dangerButtonStyle = {
  ...buttonStyle,
  background: "#fbe3e0",
  color: "#8c2f24"
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

const policySectionStyle = {
  display: "grid",
  gap: 14,
  borderRadius: 16,
  border: "1px solid #d4e1ef",
  padding: 16,
  background: "#f8fbff"
};
