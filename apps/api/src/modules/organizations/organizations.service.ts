import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { InvitationStatus, MembershipStatus } from "@prisma/client";

import { PrismaService } from "../../persistence/prisma.service";
import type { AccessPrincipal } from "../auth/auth.types";

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForPrincipal(principal: AccessPrincipal) {
    if (!principal.professionalId) {
      return [];
    }

    const memberships = await this.prisma.organizationMembership.findMany({
      where: {
        professionalId: principal.professionalId,
        status: MembershipStatus.ACTIVE
      },
      include: {
        organization: true
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
    });

    return memberships.map((membership) => ({
      id: membership.organization.id,
      name: membership.organization.name,
      slug: membership.organization.slug
    }));
  }

  async getCurrentOrganization(principal: AccessPrincipal) {
    const organizationId = principal.organizationId;
    if (!organizationId) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    const [organization, membership] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: organizationId },
        include: {
          memberships: true,
          primaryProfiles: true
        }
      }),
      this.findMembership(principal, organizationId)
    ]);

    if (!organization || !membership) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      membershipRole: membership.membershipRole,
      memberCount: organization.memberships.length,
      professionalCount: organization.primaryProfiles.length,
      settings: normalizeOrganizationSettings(organization.settings)
    };
  }

  async listCurrentMemberships(principal: AccessPrincipal) {
    const organizationId = principal.organizationId;
    if (!organizationId) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    await this.assertCanReadMemberships(principal, organizationId);

    const memberships = await this.prisma.organizationMembership.findMany({
      where: {
        organizationId
      },
      include: {
        organization: true,
        professional: {
          include: {
            user: true
          }
        }
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
    });

    return memberships.map((membership) => mapMembership(membership));
  }

  async addMembershipByEmail(
    principal: AccessPrincipal,
    input: {
      email: string;
      membershipRole?: string;
      isDefault?: boolean;
    }
  ) {
    const organizationId = principal.organizationId;
    if (!organizationId) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    await this.assertCanManageMemberships(principal, organizationId);

    const user = await this.prisma.user.findUnique({
      where: {
        email: input.email
      },
      include: {
        professionalProfile: {
          include: {
            user: true
          }
        }
      }
    });

    if (!user?.professionalProfile) {
      throw new NotFoundException("Profissional nao encontrado para o e-mail informado");
    }

    const membership = await this.prisma.organizationMembership.upsert({
      where: {
        organizationId_professionalId: {
          organizationId,
          professionalId: user.professionalProfile.id
        }
      },
      update: {
        membershipRole: input.membershipRole ?? "member",
        status: MembershipStatus.ACTIVE,
        deactivatedAt: null
      },
      create: {
        organizationId,
        professionalId: user.professionalProfile.id,
        membershipRole: input.membershipRole ?? "member",
        status: MembershipStatus.ACTIVE,
        isDefault: Boolean(input.isDefault)
      },
      include: {
        organization: true,
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    if (input.isDefault) {
      await this.setDefaultMembership(membership.organizationId, membership.professionalId);
    }

    const refreshed = await this.prisma.organizationMembership.findUniqueOrThrow({
      where: { id: membership.id },
      include: {
        organization: true,
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    return mapMembership(refreshed);
  }

  async updateMembership(
    principal: AccessPrincipal,
    membershipId: string,
    input: {
      membershipRole?: string;
      isDefault?: boolean;
      status?: "active" | "suspended" | "removed";
    }
  ) {
    const membership = await this.prisma.organizationMembership.findUnique({
      where: {
        id: membershipId
      },
      include: {
        organization: true,
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    if (!membership) {
      throw new NotFoundException("Membership nao encontrado");
    }

    await this.assertCanManageMemberships(principal, membership.organizationId);

    const updated = await this.prisma.organizationMembership.update({
      where: {
        id: membershipId
      },
      data: {
        membershipRole: input.membershipRole ?? membership.membershipRole,
        status: mapMembershipStatus(input.status) ?? membership.status,
        deactivatedAt:
          input.status && input.status !== "active" ? new Date() : input.status === "active" ? null : membership.deactivatedAt,
        isDefault:
          input.status && input.status !== "active" ? false : membership.isDefault
      },
      include: {
        organization: true,
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    if (input.isDefault) {
      await this.setDefaultMembership(updated.organizationId, updated.professionalId);
    }

    const refreshed = await this.prisma.organizationMembership.findUniqueOrThrow({
      where: { id: membershipId },
      include: {
        organization: true,
        professional: {
          include: {
            user: true
          }
        }
      }
    });

    return mapMembership(refreshed);
  }

  async listCurrentInvitations(principal: AccessPrincipal) {
    const organizationId = principal.organizationId;
    if (!organizationId) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    await this.assertCanReadMemberships(principal, organizationId);

    const invitations = await this.prisma.organizationInvitation.findMany({
      where: {
        organizationId
      },
      include: {
        organization: true
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }]
    });

    return invitations.map((invitation) => mapInvitation(invitation));
  }

  async createInvitation(
    principal: AccessPrincipal,
    input: {
      email: string;
      membershipRole?: string;
      expiresAt?: string;
    }
  ) {
    const organizationId = principal.organizationId;
    if (!organizationId) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    await this.assertCanManageMemberships(principal, organizationId);

    const invitation = await this.prisma.organizationInvitation.create({
      data: {
        organizationId,
        email: input.email.trim().toLowerCase(),
        membershipRole: input.membershipRole ?? "member",
        invitedByUserId: principal.userId,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null
      },
      include: {
        organization: true
      }
    });

    return mapInvitation(invitation);
  }

  async revokeInvitation(principal: AccessPrincipal, invitationId: string) {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: {
        id: invitationId
      },
      include: {
        organization: true
      }
    });

    if (!invitation) {
      throw new NotFoundException("Convite nao encontrado");
    }

    await this.assertCanManageMemberships(principal, invitation.organizationId);

    const updated = await this.prisma.organizationInvitation.update({
      where: {
        id: invitationId
      },
      data: {
        status: InvitationStatus.REVOKED,
        revokedAt: new Date()
      },
      include: {
        organization: true
      }
    });

    return mapInvitation(updated);
  }

  async updateCurrentSettings(
    principal: AccessPrincipal,
    input: {
      documentSharePolicy?: {
        maxUsesDefault?: number;
        expirationHoursDefault?: number;
        allowHighRiskExternalShare?: boolean;
      };
      documentPolicyMatrix?: Partial<
        Record<
          "prescription" | "exam-request" | "medical-certificate" | "free-document",
          {
            allowExternalShare?: boolean;
            requireRqe?: boolean;
            minimumShareRole?: "professional" | "admin" | "compliance";
            requirePatientConsentForExternalShare?: boolean;
            shareLinkTtlHours?: number;
            shareLinkMaxUses?: number;
          }
        >
      >;
      overridePolicy?: {
        minimumReviewerRole?: "professional" | "admin" | "compliance";
        requireInstitutionalReviewForHighSeverity?: boolean;
        requireInstitutionalReviewForModerateInteraction?: boolean;
        autoAcknowledgePrivilegedOverride?: boolean;
      };
      lgpdPolicy?: {
        requireConsentForExternalShare?: boolean;
        requireDisposalApproval?: boolean;
        retentionReviewWindowDays?: number;
      };
      brandingPolicy?: {
        allowCustomLogo?: boolean;
        lockedLayoutVersion?: string;
      };
    }
  ) {
    const organizationId = principal.organizationId;
    if (!organizationId) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    await this.assertCanManageMemberships(principal, organizationId);

    const current = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        memberships: {
          where: {
            status: MembershipStatus.ACTIVE
          }
        },
        primaryProfiles: true
      }
    });

    if (!current) {
      throw new NotFoundException("Organizacao nao encontrada");
    }

    const mergedSettings = mergeOrganizationSettings(current.settings, input);

    const updated = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        settings: mergedSettings
      },
      include: {
        memberships: {
          where: {
            status: MembershipStatus.ACTIVE
          }
        },
        primaryProfiles: true
      }
    });

    const membership = await this.findMembership(principal, organizationId);

    return {
      id: updated.id,
      name: updated.name,
      slug: updated.slug,
      membershipRole: membership?.membershipRole,
      memberCount: updated.memberships.length,
      professionalCount: updated.primaryProfiles.length,
      settings: normalizeOrganizationSettings(updated.settings)
    };
  }

  private async assertCanReadMemberships(principal: AccessPrincipal, organizationId: string) {
    const membership = await this.findMembership(principal, organizationId);

    if (!membership && !hasGlobalGovernance(principal)) {
      throw new ForbiddenException("Sessao sem acesso a memberships da organizacao");
    }
  }

  private async assertCanManageMemberships(principal: AccessPrincipal, organizationId: string) {
    if (hasGlobalGovernance(principal)) {
      return;
    }

    const membership = await this.findMembership(principal, organizationId);
    if (!membership || !["owner", "admin"].includes(membership.membershipRole)) {
      throw new ForbiddenException("Sessao sem permissao para gerir memberships");
    }
  }

  private async findMembership(principal: AccessPrincipal, organizationId: string) {
    if (!principal.professionalId) {
      return null;
    }

    return this.prisma.organizationMembership.findFirst({
      where: {
        organizationId,
        professionalId: principal.professionalId,
        status: MembershipStatus.ACTIVE
      }
    });
  }

  private async setDefaultMembership(organizationId: string, professionalId: string) {
    await this.prisma.organizationMembership.updateMany({
      where: {
        professionalId,
        status: MembershipStatus.ACTIVE
      },
      data: {
        isDefault: false
      }
    });

    await this.prisma.organizationMembership.update({
      where: {
        organizationId_professionalId: {
          organizationId,
          professionalId
        }
      },
      data: {
        isDefault: true
      }
    });

    await this.prisma.professionalProfile.update({
      where: {
        id: professionalId
      },
      data: {
        primaryOrganizationId: organizationId
      }
    });
  }
}

function hasGlobalGovernance(principal: AccessPrincipal) {
  return principal.roles.some((role) => role === "admin" || role === "compliance");
}

function mapMembership(membership: {
  id: string;
  organizationId: string;
  membershipRole: string;
  status: MembershipStatus;
  isDefault: boolean;
  invitedByUserId: string | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  professional: {
    id: string;
    user: {
      fullName: string;
      email: string;
    };
  };
}) {
  return {
    id: membership.id,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationSlug: membership.organization.slug,
    professionalId: membership.professional.id,
    professionalName: membership.professional.user.fullName,
    professionalEmail: membership.professional.user.email,
    membershipRole: membership.membershipRole,
    status: membership.status.toLowerCase(),
    isDefault: membership.isDefault,
    invitedByUserId: membership.invitedByUserId,
    deactivatedAt: membership.deactivatedAt?.toISOString() ?? null,
    createdAt: membership.createdAt.toISOString()
  };
}

function mapInvitation(invitation: {
  id: string;
  organizationId: string;
  email: string;
  membershipRole: string;
  status: InvitationStatus;
  invitedByUserId: string | null;
  expiresAt: Date | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
}) {
  return {
    id: invitation.id,
    organizationId: invitation.organizationId,
    organizationName: invitation.organization.name,
    organizationSlug: invitation.organization.slug,
    email: invitation.email,
    membershipRole: invitation.membershipRole,
    status: invitation.status.toLowerCase(),
    invitedByUserId: invitation.invitedByUserId,
    expiresAt: invitation.expiresAt?.toISOString() ?? null,
    acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
    revokedAt: invitation.revokedAt?.toISOString() ?? null,
    createdAt: invitation.createdAt.toISOString(),
    updatedAt: invitation.updatedAt.toISOString()
  };
}

function mapMembershipStatus(status?: "active" | "suspended" | "removed") {
  if (!status) {
    return undefined;
  }

  switch (status) {
    case "active":
      return MembershipStatus.ACTIVE;
    case "suspended":
      return MembershipStatus.SUSPENDED;
    case "removed":
      return MembershipStatus.REMOVED;
  }
}

function normalizeOrganizationSettings(input: unknown) {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const share = readObject(value.documentSharePolicy);
  const matrix = readObject(value.documentPolicyMatrix);
  const override = readObject(value.overridePolicy);
  const lgpd = readObject(value.lgpdPolicy);
  const branding = readObject(value.brandingPolicy);

  return {
    documentSharePolicy: {
      maxUsesDefault:
        typeof share.maxUsesDefault === "number" ? share.maxUsesDefault : 3,
      expirationHoursDefault:
        typeof share.expirationHoursDefault === "number" ? share.expirationHoursDefault : 72,
      allowHighRiskExternalShare:
        typeof share.allowHighRiskExternalShare === "boolean"
          ? share.allowHighRiskExternalShare
          : false
    },
    documentPolicyMatrix: {
      prescription: normalizeDocumentPolicyEntry(readObject(matrix.prescription), {
        allowExternalShare: true,
        requireRqe: false,
        minimumShareRole: "professional",
        requirePatientConsentForExternalShare: false,
        shareLinkTtlHours: 24,
        shareLinkMaxUses: 3
      }),
      "exam-request": normalizeDocumentPolicyEntry(readObject(matrix["exam-request"]), {
        allowExternalShare: true,
        requireRqe: false,
        minimumShareRole: "professional",
        requirePatientConsentForExternalShare: false,
        shareLinkTtlHours: 72,
        shareLinkMaxUses: 5
      }),
      "medical-certificate": normalizeDocumentPolicyEntry(
        readObject(matrix["medical-certificate"]),
        {
          allowExternalShare: true,
          requireRqe: false,
          minimumShareRole: "professional",
          requirePatientConsentForExternalShare: true,
          shareLinkTtlHours: 48,
          shareLinkMaxUses: 3
        }
      ),
      "free-document": normalizeDocumentPolicyEntry(readObject(matrix["free-document"]), {
        allowExternalShare: false,
        requireRqe: false,
        minimumShareRole: "admin",
        requirePatientConsentForExternalShare: true,
        shareLinkTtlHours: 12,
        shareLinkMaxUses: 1
      })
    },
    overridePolicy: {
      minimumReviewerRole:
        override.minimumReviewerRole === "professional" ||
        override.minimumReviewerRole === "admin" ||
        override.minimumReviewerRole === "compliance"
          ? override.minimumReviewerRole
          : "compliance",
      requireInstitutionalReviewForHighSeverity:
        typeof override.requireInstitutionalReviewForHighSeverity === "boolean"
          ? override.requireInstitutionalReviewForHighSeverity
          : true,
      requireInstitutionalReviewForModerateInteraction:
        typeof override.requireInstitutionalReviewForModerateInteraction === "boolean"
          ? override.requireInstitutionalReviewForModerateInteraction
          : true,
      autoAcknowledgePrivilegedOverride:
        typeof override.autoAcknowledgePrivilegedOverride === "boolean"
          ? override.autoAcknowledgePrivilegedOverride
          : true
    },
    lgpdPolicy: {
      requireConsentForExternalShare:
        typeof lgpd.requireConsentForExternalShare === "boolean"
          ? lgpd.requireConsentForExternalShare
          : false,
      requireDisposalApproval:
        typeof lgpd.requireDisposalApproval === "boolean"
          ? lgpd.requireDisposalApproval
          : true,
      retentionReviewWindowDays:
        typeof lgpd.retentionReviewWindowDays === "number"
          ? lgpd.retentionReviewWindowDays
          : 30
    },
    brandingPolicy: {
      allowCustomLogo:
        typeof branding.allowCustomLogo === "boolean" ? branding.allowCustomLogo : false,
      lockedLayoutVersion:
        typeof branding.lockedLayoutVersion === "string"
          ? branding.lockedLayoutVersion
          : undefined
    }
  };
}

function mergeOrganizationSettings(current: unknown, patch: unknown) {
  const base = normalizeOrganizationSettings(current);
  const next = patch && typeof patch === "object" ? (patch as Record<string, unknown>) : {};
  const share = readObject(next.documentSharePolicy);
  const matrix = readObject(next.documentPolicyMatrix);
  const override = readObject(next.overridePolicy);
  const lgpd = readObject(next.lgpdPolicy);
  const branding = readObject(next.brandingPolicy);

  return {
    documentSharePolicy: {
      maxUsesDefault:
        typeof share.maxUsesDefault === "number"
          ? share.maxUsesDefault
          : base.documentSharePolicy.maxUsesDefault,
      expirationHoursDefault:
        typeof share.expirationHoursDefault === "number"
          ? share.expirationHoursDefault
          : base.documentSharePolicy.expirationHoursDefault,
      allowHighRiskExternalShare:
        typeof share.allowHighRiskExternalShare === "boolean"
          ? share.allowHighRiskExternalShare
          : base.documentSharePolicy.allowHighRiskExternalShare
    },
    documentPolicyMatrix: {
      prescription: mergeDocumentPolicyEntry(
        base.documentPolicyMatrix.prescription,
        readObject(matrix.prescription)
      ),
      "exam-request": mergeDocumentPolicyEntry(
        base.documentPolicyMatrix["exam-request"],
        readObject(matrix["exam-request"])
      ),
      "medical-certificate": mergeDocumentPolicyEntry(
        base.documentPolicyMatrix["medical-certificate"],
        readObject(matrix["medical-certificate"])
      ),
      "free-document": mergeDocumentPolicyEntry(
        base.documentPolicyMatrix["free-document"],
        readObject(matrix["free-document"])
      )
    },
    overridePolicy: {
      minimumReviewerRole:
        override.minimumReviewerRole === "professional" ||
        override.minimumReviewerRole === "admin" ||
        override.minimumReviewerRole === "compliance"
          ? override.minimumReviewerRole
          : base.overridePolicy.minimumReviewerRole,
      requireInstitutionalReviewForHighSeverity:
        typeof override.requireInstitutionalReviewForHighSeverity === "boolean"
          ? override.requireInstitutionalReviewForHighSeverity
          : base.overridePolicy.requireInstitutionalReviewForHighSeverity,
      requireInstitutionalReviewForModerateInteraction:
        typeof override.requireInstitutionalReviewForModerateInteraction === "boolean"
          ? override.requireInstitutionalReviewForModerateInteraction
          : base.overridePolicy.requireInstitutionalReviewForModerateInteraction,
      autoAcknowledgePrivilegedOverride:
        typeof override.autoAcknowledgePrivilegedOverride === "boolean"
          ? override.autoAcknowledgePrivilegedOverride
          : base.overridePolicy.autoAcknowledgePrivilegedOverride
    },
    lgpdPolicy: {
      requireConsentForExternalShare:
        typeof lgpd.requireConsentForExternalShare === "boolean"
          ? lgpd.requireConsentForExternalShare
          : base.lgpdPolicy.requireConsentForExternalShare,
      requireDisposalApproval:
        typeof lgpd.requireDisposalApproval === "boolean"
          ? lgpd.requireDisposalApproval
          : base.lgpdPolicy.requireDisposalApproval,
      retentionReviewWindowDays:
        typeof lgpd.retentionReviewWindowDays === "number"
          ? lgpd.retentionReviewWindowDays
          : base.lgpdPolicy.retentionReviewWindowDays
    },
    brandingPolicy: {
      allowCustomLogo:
        typeof branding.allowCustomLogo === "boolean"
          ? branding.allowCustomLogo
          : base.brandingPolicy.allowCustomLogo,
      lockedLayoutVersion:
        typeof branding.lockedLayoutVersion === "string"
          ? branding.lockedLayoutVersion
          : base.brandingPolicy.lockedLayoutVersion
    }
  };
}

function readObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function normalizeDocumentPolicyEntry(
  value: Record<string, unknown>,
  fallback: {
    allowExternalShare: boolean;
    requireRqe: boolean;
    minimumShareRole: "professional" | "admin" | "compliance";
    requirePatientConsentForExternalShare: boolean;
    shareLinkTtlHours: number;
    shareLinkMaxUses: number;
  }
) {
  return {
    allowExternalShare:
      typeof value.allowExternalShare === "boolean"
        ? value.allowExternalShare
        : fallback.allowExternalShare,
    requireRqe:
      typeof value.requireRqe === "boolean" ? value.requireRqe : fallback.requireRqe,
    minimumShareRole:
      value.minimumShareRole === "professional" ||
      value.minimumShareRole === "admin" ||
      value.minimumShareRole === "compliance"
        ? value.minimumShareRole
        : fallback.minimumShareRole,
    requirePatientConsentForExternalShare:
      typeof value.requirePatientConsentForExternalShare === "boolean"
        ? value.requirePatientConsentForExternalShare
        : fallback.requirePatientConsentForExternalShare,
    shareLinkTtlHours:
      typeof value.shareLinkTtlHours === "number"
        ? value.shareLinkTtlHours
        : fallback.shareLinkTtlHours,
    shareLinkMaxUses:
      typeof value.shareLinkMaxUses === "number"
        ? value.shareLinkMaxUses
        : fallback.shareLinkMaxUses
  };
}

function mergeDocumentPolicyEntry(
  base: {
    allowExternalShare: boolean;
    requireRqe: boolean;
    minimumShareRole: "professional" | "admin" | "compliance";
    requirePatientConsentForExternalShare: boolean;
    shareLinkTtlHours: number;
    shareLinkMaxUses: number;
  },
  patch: Record<string, unknown>
) {
  return normalizeDocumentPolicyEntry(patch, base);
}
