import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ComplianceService } from "./compliance.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller("compliance")
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @RequireRoles("professional", "admin", "compliance")
  @Get("policies")
  listPolicies() {
    return this.complianceService.listPolicies();
  }

  @RequireRoles("professional", "admin", "compliance")
  @Get("policies/:documentType")
  getPolicy(@Param("documentType") documentType: string) {
    return this.complianceService.getPolicy(documentType as never);
  }

  @RequireRoles("admin", "compliance")
  @Get("retention")
  getRetentionPolicy() {
    return this.complianceService.getRetentionPolicySnapshot();
  }

  @RequireRoles("admin", "compliance")
  @Get("retention/operations")
  getRetentionOperations(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.complianceService.getRetentionOperationsSummary(principal);
  }

  @RequireRoles("admin", "compliance")
  @Get("analytics/anonymized")
  getAnonymizedAnalytics(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Query()
    query?: {
      dateFrom?: string;
      dateTo?: string;
    }
  ) {
    return this.complianceService.getAnonymizedAnalyticsSnapshot(principal, query);
  }
}
