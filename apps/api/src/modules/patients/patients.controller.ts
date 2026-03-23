import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { ResourceAccessService } from "../access/resource-access.service";
import { PatientsService } from "./patients.service";

@UseGuards(AuthGuard)
@Controller("patients")
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly resourceAccessService: ResourceAccessService
  ) {}

  @Get()
  list(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.patientsService.list(this.resourceAccessService.buildPatientScope(principal));
  }

  @Post()
  create(@CurrentPrincipal() principal: AccessPrincipal, @Body() input: any) {
    return this.patientsService.create(input, principal);
  }

  @Get(":id")
  async getById(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertPatientAccess(principal, id, "patient_read");
    return this.patientsService.getById(id);
  }

  @Patch(":id/clinical-profile")
  async updateClinicalProfile(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body() input: any
  ) {
    await this.resourceAccessService.assertPatientAccess(
      principal,
      id,
      "patient_clinical_profile_update"
    );
    return this.patientsService.upsertClinicalProfile(id, input, principal);
  }
}
