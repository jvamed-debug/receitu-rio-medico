import { Controller, Get, Param, UseGuards } from "@nestjs/common";

import { ResourceAccessService } from "../access/resource-access.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { HistoryService } from "./history.service";

@UseGuards(AuthGuard)
@Controller()
export class HistoryController {
  constructor(
    private readonly historyService: HistoryService,
    private readonly resourceAccessService: ResourceAccessService
  ) {}

  @Get("history")
  history(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.historyService.getHistory(scopeProfessionalId(principal));
  }

  @Get("patients/:id/history")
  async patientHistory(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertPatientAccess(principal, id, "patient_history_read");
    return this.historyService.getPatientHistory(id, scopeProfessionalId(principal));
  }
}

function scopeProfessionalId(principal: { professionalId?: string; roles?: string[] }) {
  return principal.roles?.some((role) => role == "admin" || role == "compliance")
    ? undefined
    : principal.professionalId;
}
