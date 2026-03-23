import { Injectable } from "@nestjs/common";
import type { AppointmentMaintenanceRunSummary } from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AccessPrincipal } from "../auth/auth.types";
import { buildAppointmentScope } from "./appointments.scope";
import { AppointmentBillingService } from "./billing/appointment-billing.service";
import { AppointmentRemindersService } from "./reminders/appointment-reminders.service";

@Injectable()
export class AppointmentMaintenanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly remindersService: AppointmentRemindersService,
    private readonly billingService: AppointmentBillingService,
    private readonly auditService: AuditService
  ) {}

  async run(principal: AccessPrincipal): Promise<AppointmentMaintenanceRunSummary> {
    const scope = buildAppointmentScope(principal);
    const appointments = await this.prisma.appointment.findMany({
      where: scope,
      select: {
        id: true
      }
    });
    const appointmentIds = appointments.map((appointment) => appointment.id);

    if (appointmentIds.length === 0) {
      return {
        ranAt: new Date().toISOString(),
        retryableRemindersFound: 0,
        remindersRetried: 0,
        remindersStillFailing: 0,
        pendingWebhookEventsFound: 0,
        webhooksReprocessed: 0,
        webhookFailures: 0
      };
    }

    const [retryableReminders, pendingWebhookEvents] = await Promise.all([
      this.prisma.appointmentReminder.findMany({
        where: {
          appointmentId: { in: appointmentIds },
          status: "FAILED",
          nextAttemptAt: {
            lte: new Date()
          }
        },
        orderBy: {
          nextAttemptAt: "asc"
        },
        take: 20
      }),
      this.prisma.appointmentBillingWebhookEvent.findMany({
        where: {
          appointmentId: { in: appointmentIds },
          OR: [{ processedAt: null }, { resultStatus: "failed" }]
        },
        orderBy: {
          createdAt: "asc"
        },
        take: 20
      })
    ]);

    let remindersRetried = 0;
    let remindersStillFailing = 0;

    for (const reminder of retryableReminders) {
      const result = await this.remindersService.retryReminder(
        reminder.appointmentId,
        reminder.id,
        principal
      );

      if (result.status === "sent") {
        remindersRetried += 1;
      } else {
        remindersStillFailing += 1;
      }
    }

    let webhooksReprocessed = 0;
    let webhookFailures = 0;

    for (const event of pendingWebhookEvents) {
      const payload = event.payload as
        | {
            appointmentId?: string;
            billingId?: string;
            status?: "authorized" | "paid" | "cancelled" | "refunded";
          }
        | undefined;

      if (!payload?.appointmentId || !payload.billingId || !payload.status) {
        await this.prisma.appointmentBillingWebhookEvent.update({
          where: { id: event.id },
          data: {
            resultStatus: "failed"
          }
        });
        webhookFailures += 1;
        continue;
      }

      try {
        const reconciled = await this.billingService.reconcileEntry(
          payload.appointmentId,
          payload.billingId,
          { status: payload.status },
          principal
        );

        await this.prisma.appointmentBillingWebhookEvent.update({
          where: { id: event.id },
          data: {
            processedAt: new Date(),
            resultStatus: reconciled.status
          }
        });
        webhooksReprocessed += 1;
      } catch {
        await this.prisma.appointmentBillingWebhookEvent.update({
          where: { id: event.id },
          data: {
            resultStatus: "failed"
          }
        });
        webhookFailures += 1;
      }
    }

    const summary = {
      ranAt: new Date().toISOString(),
      retryableRemindersFound: retryableReminders.length,
      remindersRetried,
      remindersStillFailing,
      pendingWebhookEventsFound: pendingWebhookEvents.length,
      webhooksReprocessed,
      webhookFailures
    } satisfies AppointmentMaintenanceRunSummary;

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment_operations",
      entityId: principal.organizationId ?? principal.professionalId ?? principal.userId,
      action: "appointment_maintenance_run",
      origin: "api.appointments.maintenance",
      metadata: summary
    });

    return summary;
  }
}
