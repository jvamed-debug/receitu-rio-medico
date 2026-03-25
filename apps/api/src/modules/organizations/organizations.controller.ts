import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { OrganizationsService } from "./organizations.service";

@UseGuards(AuthGuard)
@Controller("organizations")
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  listMine(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.organizationsService.listForPrincipal(principal);
  }

  @Get("current")
  getCurrent(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.organizationsService.getCurrentOrganization(principal);
  }

  @Get("current/memberships")
  listCurrentMemberships(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.organizationsService.listCurrentMemberships(principal);
  }

  @Get("current/invitations")
  listCurrentInvitations(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.organizationsService.listCurrentInvitations(principal);
  }

  @Patch("current/settings")
  updateCurrentSettings(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body()
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
    return this.organizationsService.updateCurrentSettings(principal, input);
  }

  @Post("current/memberships")
  addMembershipByEmail(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body()
    input: {
      email: string;
      membershipRole?: string;
      isDefault?: boolean;
    }
  ) {
    return this.organizationsService.addMembershipByEmail(principal, input);
  }

  @Post("current/invitations")
  createInvitation(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body()
    input: {
      email: string;
      membershipRole?: string;
      expiresAt?: string;
    }
  ) {
    return this.organizationsService.createInvitation(principal, input);
  }

  @Patch("current/memberships/:membershipId")
  updateMembership(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("membershipId") membershipId: string,
    @Body()
    input: {
      membershipRole?: string;
      isDefault?: boolean;
      status?: "active" | "suspended" | "removed";
    }
  ) {
    return this.organizationsService.updateMembership(principal, membershipId, input);
  }

  @Post("current/invitations/:invitationId/revoke")
  revokeInvitation(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("invitationId") invitationId: string
  ) {
    return this.organizationsService.revokeInvitation(principal, invitationId);
  }
}
