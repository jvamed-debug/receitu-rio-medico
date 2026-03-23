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

  @Get(":id/encounters")
  async listEncounters(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertPatientAccess(principal, id, "patient_encounter_read");
    return this.patientsService.listEncounters(id);
  }

  @Post(":id/encounters")
  async createEncounter(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body()
    input: {
      type?:
        | "consultation"
        | "follow_up"
        | "telehealth"
        | "triage"
        | "procedure"
        | "clinical_note";
      title: string;
      summary?: string;
      notes?: string;
      occurredAt?: string;
    }
  ) {
    await this.resourceAccessService.assertPatientAccess(
      principal,
      id,
      "patient_encounter_create"
    );
    return this.patientsService.createEncounter(id, input, principal);
  }

  @Get(":id/evolutions")
  async listEvolutions(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertPatientAccess(principal, id, "patient_timeline_read");
    return this.patientsService.listEvolutions(id);
  }

  @Post(":id/evolutions")
  async createEvolution(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body()
    input: {
      encounterId?: string;
      title: string;
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      tags?: string[];
      occurredAt?: string;
    }
  ) {
    await this.resourceAccessService.assertPatientAccess(
      principal,
      id,
      "patient_encounter_create"
    );
    return this.patientsService.createEvolution(id, input, principal);
  }

  @Get(":id/timeline")
  async getTimeline(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertPatientAccess(principal, id, "patient_timeline_read");
    return this.patientsService.getTimeline(id);
  }
}
