import { Controller, Get, Param, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
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
}
