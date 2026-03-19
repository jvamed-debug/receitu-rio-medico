import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AuditService } from "./audit.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller("audit")
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get("health")
  health() {
    return {
      mode: "append-only-ready",
      retention: "defined-in-infra"
    };
  }

  @RequireRoles("admin", "compliance")
  @Get("events")
  listRecent(@Query("limit") limit?: string) {
    const parsedLimit = Number.parseInt(limit ?? "50", 10);
    return this.auditService.listRecent(Number.isNaN(parsedLimit) ? 50 : parsedLimit);
  }

  @RequireRoles("admin", "compliance")
  @Get("entities/:entityType/:entityId")
  listByEntity(
    @Param("entityType") entityType: string,
    @Param("entityId") entityId: string
  ) {
    return this.auditService.listByEntity(entityType, entityId);
  }
}
