import {
  Body,
  Controller,
  Get,
  NotFoundException,
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
import { AppointmentRemindersService } from "./reminders/appointment-reminders.service";

@UseGuards(AuthGuard)
@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly resourceAccessService: ResourceAccessService,
    private readonly appointmentRemindersService: AppointmentRemindersService
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
  async updateStatus(
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
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentsService.updateStatus(id, input, principal);
  }

  @Get(":id/reminders")
  async listReminders(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentRemindersService.listByAppointment(id);
  }

  @Post(":id/reminders")
  async createReminder(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body()
    input: {
      channel: "email" | "sms" | "whatsapp";
      scheduledFor: string;
      message?: string;
    }
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentRemindersService.scheduleReminder(id, input, principal);
  }

  @Post(":id/reminders/:reminderId/send")
  async sendReminder(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Param("reminderId") reminderId: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentRemindersService.dispatchReminder(id, reminderId, principal);
  }

  private async assertAppointmentAccess(
    principal: AccessPrincipal,
    appointmentId: string
  ) {
    const appointments = await this.appointmentsService.list(principal);
    const allowed = appointments.some((appointment) => appointment.id === appointmentId);

    if (!allowed) {
      throw new NotFoundException("Consulta nao encontrada");
    }
  }
}
