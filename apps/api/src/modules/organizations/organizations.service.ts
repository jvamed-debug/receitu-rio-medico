import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from "@nestjs/common";

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
        professionalId: principal.professionalId
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
        membershipRole: input.membershipRole ?? "member"
      },
      create: {
        organizationId,
        professionalId: user.professionalProfile.id,
        membershipRole: input.membershipRole ?? "member",
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
        membershipRole: input.membershipRole ?? membership.membershipRole
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

  async updateCurrentSettings(
    principal: AccessPrincipal,
    input: {
      documentSharePolicy?: {
        maxUsesDefault?: number;
        expirationHoursDefault?: number;
        allowHighRiskExternalShare?: boolean;
      };
      overridePolicy?: {
        minimumReviewerRole?: "professional" | "admin" | "compliance";
        requireInstitutionalReviewForHighSeverity?: boolean;
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
        memberships: true,
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
        memberships: true,
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
        professionalId: principal.professionalId
      }
    });
  }

  private async setDefaultMembership(organizationId: string, professionalId: string) {
    await this.prisma.organizationMembership.updateMany({
      where: {
        professionalId
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
  isDefault: boolean;
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
    isDefault: membership.isDefault,
    createdAt: membership.createdAt.toISOString()
  };
}

function normalizeOrganizationSettings(input: unknown) {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const share = readObject(value.documentSharePolicy);
  const override = readObject(value.overridePolicy);
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
          : true
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
  const override = readObject(next.overridePolicy);
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
          : base.overridePolicy.requireInstitutionalReviewForHighSeverity
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
