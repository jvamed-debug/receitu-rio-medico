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
import { AppointmentBillingService } from "./billing/appointment-billing.service";
import { AppointmentsService } from "./appointments.service";
import { AppointmentRemindersService } from "./reminders/appointment-reminders.service";
import { TelehealthService } from "./telehealth/telehealth.service";

@UseGuards(AuthGuard)
@Controller("appointments")
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
    private readonly resourceAccessService: ResourceAccessService,
    private readonly appointmentRemindersService: AppointmentRemindersService,
    private readonly appointmentBillingService: AppointmentBillingService,
    private readonly telehealthService: TelehealthService
  ) {}

  @Get()
  list(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.appointmentsService.list(principal);
  }

  @Get("summary")
  summary(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.appointmentsService.summary(principal);
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

  @Post(":id/reminders/:reminderId/retry")
  async retryReminder(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Param("reminderId") reminderId: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentRemindersService.retryReminder(id, reminderId, principal);
  }

  @Get(":id/billing")
  async listBilling(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentBillingService.listByAppointment(id);
  }

  @Post(":id/billing")
  async createBilling(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body()
    input: {
      amountCents: number;
      description: string;
      paymentProvider?: string;
    }
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentBillingService.createEntry(id, input, principal);
  }

  @Post(":id/billing/:billingId/authorize")
  async authorizeBilling(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Param("billingId") billingId: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentBillingService.authorizeEntry(id, billingId, principal);
  }

  @Post(":id/billing/:billingId/pay")
  async payBilling(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Param("billingId") billingId: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentBillingService.payEntry(id, billingId, principal);
  }

  @Post(":id/billing/:billingId/checkout")
  async createBillingCheckout(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Param("billingId") billingId: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentBillingService.createCheckout(id, billingId, principal);
  }

  @Post(":id/billing/:billingId/reconcile")
  async reconcileBilling(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Param("billingId") billingId: string,
    @Body()
    input: {
      status: "authorized" | "paid" | "cancelled" | "refunded";
    }
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.appointmentBillingService.reconcileEntry(id, billingId, input, principal);
  }

  @Post(":id/telehealth/room")
  async createTelehealthRoom(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.assertAppointmentAccess(principal, id);
    return this.telehealthService.ensureRoom(id, principal);
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
