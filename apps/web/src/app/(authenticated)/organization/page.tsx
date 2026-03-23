import { OrganizationGovernancePanel } from "../../../components/organizations/organization-governance-panel";
import { Shell } from "../../../components/shell";
import { createServerApiClient } from "../../../lib/api";

export const dynamic = "force-dynamic";

async function loadOrganizationContext() {
  const api = await createServerApiClient();

  try {
    const [currentOrganization, organizations, memberships, invitations] = await Promise.all([
      api.getCurrentOrganization(),
      api.listMyOrganizations(),
      api.listCurrentOrganizationMemberships(),
      api.listCurrentOrganizationInvitations()
    ]);

    return {
      currentOrganization,
      organizations,
      memberships,
      invitations
    };
  } catch {
    return {
      currentOrganization: null,
      organizations: [],
      memberships: [],
      invitations: []
    };
  }
}

export default async function OrganizationPage() {
  const { currentOrganization, organizations, memberships, invitations } =
    await loadOrganizationContext();

  return (
    <Shell
      title="Governanca institucional"
      subtitle="Troca de organizacao ativa, memberships e contexto operacional do tenant."
    >
      <OrganizationGovernancePanel
        currentOrganization={currentOrganization}
        organizations={organizations}
        initialMemberships={memberships}
        initialInvitations={invitations}
      />
    </Shell>
  );
}
