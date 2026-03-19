import { Controller, Get, Param, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import { HistoryService } from "./history.service";

@UseGuards(AuthGuard)
@Controller()
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get("history")
  history(
    @CurrentPrincipal() principal: { professionalId?: string; roles?: string[] }
  ) {
    return this.historyService.getHistory(scopeProfessionalId(principal));
  }

  @Get("patients/:id/history")
  patientHistory(
    @CurrentPrincipal() principal: { professionalId?: string; roles?: string[] },
    @Param("id") id: string
  ) {
    return this.historyService.getPatientHistory(id, scopeProfessionalId(principal));
  }
}

function scopeProfessionalId(principal: { professionalId?: string; roles?: string[] }) {
  return principal.roles?.some((role) => role == "admin" || role == "compliance")
    ? undefined
    : principal.professionalId;
}
