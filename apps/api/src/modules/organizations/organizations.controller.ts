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

  @Patch("current/memberships/:membershipId")
  updateMembership(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("membershipId") membershipId: string,
    @Body()
    input: {
      membershipRole?: string;
      isDefault?: boolean;
    }
  ) {
    return this.organizationsService.updateMembership(principal, membershipId, input);
  }
}
