import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards
} from "@nestjs/common";

import { ResourceAccessService } from "../access/resource-access.service";
import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { AppointmentsService } from "./appointments.service";

@UseGuards(AuthGuard)
@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly resourceAccessService: ResourceAccessService
  ) {}

  @Get()
  list(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.appointmentsService.list(principal);
  }

  @Post()
  async create(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body()
    input: {
      patientId: string;
      title: string;
      appointmentAt: string;
      durationMinutes?: number;
      notes?: string;
      telehealth?: boolean;
    }
  ) {
    await this.resourceAccessService.assertPatientAccess(
      principal,
      input.patientId,
      "appointment_create"
    );
    return this.appointmentsService.create(input, principal);
  }

  @Patch(":id/status")
  updateStatus(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body()
    input: {
      status:
        | "scheduled"
        | "confirmed"
        | "checked_in"
        | "completed"
        | "cancelled"
        | "no_show";
      notes?: string;
    }
  ) {
    return this.appointmentsService.updateStatus(id, input, principal);
  }
}
