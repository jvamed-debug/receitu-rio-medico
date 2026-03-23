import {
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import type {
  Appointment,
  AppointmentAnalyticsSnapshot,
  AppointmentBillingWebhookEventSummary,
  AppointmentOperationsSnapshot,
  AppointmentSummary
} from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import type { AccessPrincipal } from "../auth/auth.types";
import {
  type AppointmentAnalyticsFilters,
  buildAppointmentScope
} from "./appointments.scope";

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(principal: AccessPrincipal, filters?: AppointmentAnalyticsFilters) {
    const appointments = await this.prisma.appointment.findMany({
      where: buildAppointmentScope(principal, filters),
      include: {
        patient: {
          select: {
            fullName: true
          }
        },
        billingEntries: true
      },
      orderBy: {
        appointmentAt: "asc"
      }
    });

    return appointments.map(mapAppointmentRecord);
  }

  async summary(
    principal: AccessPrincipal,
    filters?: AppointmentAnalyticsFilters
  ): Promise<AppointmentSummary> {
    const appointments = await this.prisma.appointment.findMany({
      where: buildAppointmentScope(principal, filters),
      include: {
        reminders: true,
        billingEntries: true
      }
    });

    return appointments.reduce<AppointmentSummary>(
      (acc, appointment) => {
        acc.total += 1;
        if (appointment.status === "SCHEDULED") acc.scheduled += 1;
        if (appointment.status === "CONFIRMED") acc.confirmed += 1;
        if (appointment.status === "COMPLETED") acc.completed += 1;
        if (appointment.telehealth) acc.telehealth += 1;

        for (const reminder of appointment.reminders) {
          if (reminder.status === "PENDING") {
            acc.remindersPending += 1;
          }
        }

        for (const billing of appointment.billingEntries) {
          if (billing.status === "PENDING") {
            acc.billingPendingCount += 1;
            acc.billingPendingCents += billing.amountCents;
          } else if (billing.status === "AUTHORIZED") {
            acc.billingAuthorizedCount += 1;
            acc.billingAuthorizedCents += billing.amountCents;
          } else if (billing.status === "PAID") {
            acc.billingPaidCount += 1;
            acc.billingPaidCents += billing.amountCents;
          }
        }

        return acc;
      },
      {
        total: 0,
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        telehealth: 0,
        remindersPending: 0,
        billingPendingCount: 0,
        billingAuthorizedCount: 0,
        billingPaidCount: 0,
        billingPendingCents: 0,
        billingAuthorizedCents: 0,
        billingPaidCents: 0
      }
    );
  }

  async analytics(
    principal: AccessPrincipal,
    filters?: AppointmentAnalyticsFilters
  ): Promise<AppointmentAnalyticsSnapshot> {
    const appointments = await this.prisma.appointment.findMany({
      where: buildAppointmentScope(principal, filters),
      include: {
        professional: {
          select: {
            user: {
              select: {
                fullName: true
              }
            }
          }
        },
        billingEntries: true
      },
      orderBy: {
        appointmentAt: "asc"
      }
    });

    const periodMap = new Map<
      string,
      {
        total: number;
        completed: number;
        cancelled: number;
        noShow: number;
        paidCents: number;
      }
    >();
    const professionalMap = new Map<
      string,
      {
        professionalId: string;
        professionalName?: string;
        total: number;
        completed: number;
        noShow: number;
        paidCents: number;
      }
    >();

    const summary = appointments.reduce<AppointmentAnalyticsSnapshot>(
      (acc, appointment) => {
        acc.total += 1;
        if (appointment.status === "SCHEDULED") acc.scheduled += 1;
        if (appointment.status === "CONFIRMED") acc.confirmed += 1;
        if (appointment.status === "COMPLETED") acc.completed += 1;
        if (appointment.status === "CANCELLED") acc.cancelled += 1;
        if (appointment.status === "NO_SHOW") acc.noShow += 1;
        if (appointment.telehealth) acc.telehealth += 1;

        const periodKey = appointment.appointmentAt.toISOString().slice(0, 10);
        const periodBucket = periodMap.get(periodKey) ?? {
          total: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          paidCents: 0
        };
        periodBucket.total += 1;
        if (appointment.status === "COMPLETED") periodBucket.completed += 1;
        if (appointment.status === "CANCELLED") periodBucket.cancelled += 1;
        if (appointment.status === "NO_SHOW") periodBucket.noShow += 1;

        const professionalBucket = professionalMap.get(appointment.professionalId) ?? {
          professionalId: appointment.professionalId,
          professionalName: appointment.professional.user.fullName,
          total: 0,
          completed: 0,
          noShow: 0,
          paidCents: 0
        };
        professionalBucket.total += 1;
        if (appointment.status === "COMPLETED") professionalBucket.completed += 1;
        if (appointment.status === "NO_SHOW") professionalBucket.noShow += 1;

        for (const billing of appointment.billingEntries) {
          if (billing.status === "PENDING") {
            acc.billingPendingCents += billing.amountCents;
          }
          if (billing.status === "PAID") {
            acc.billingPaidCents += billing.amountCents;
            periodBucket.paidCents += billing.amountCents;
            professionalBucket.paidCents += billing.amountCents;
          }
        }

        periodMap.set(periodKey, periodBucket);
        professionalMap.set(appointment.professionalId, professionalBucket);

        return acc;
      },
      {
        range: {
          dateFrom: filters?.dateFrom,
          dateTo: filters?.dateTo
        },
        total: 0,
        scheduled: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        telehealth: 0,
        billingPendingCents: 0,
        billingPaidCents: 0,
        periods: [],
        professionals: []
      }
    );

    summary.periods = [...periodMap.entries()].map(([period, values]) => ({
      period,
      ...values
    }));
    summary.professionals = [...professionalMap.values()].sort(
      (left, right) => right.total - left.total
    );

    return summary;
  }

  async operations(
    principal: AccessPrincipal,
    filters?: AppointmentAnalyticsFilters
  ): Promise<AppointmentOperationsSnapshot> {
    const scope = buildAppointmentScope(principal, filters);
    const appointments = await this.prisma.appointment.findMany({
      where: scope,
      select: {
        id: true
      }
    });
    const appointmentIds = appointments.map((appointment) => appointment.id);

    if (appointmentIds.length === 0) {
      return {
        failedReminders: 0,
        remindersAwaitingRetry: 0,
        webhookFailures: 0,
        pendingWebhookProcessing: 0,
        highestSeverity: "none",
        alerts: [],
        recentWebhookEvents: []
      };
    }

    const [failedReminders, retryableReminders, recentWebhookEvents] = await Promise.all([
      this.prisma.appointmentReminder.count({
        where: {
          appointmentId: { in: appointmentIds },
          status: "FAILED"
        }
      }),
      this.prisma.appointmentReminder.count({
        where: {
          appointmentId: { in: appointmentIds },
          status: "FAILED",
          nextAttemptAt: {
            not: null
          }
        }
      }),
      this.prisma.appointmentBillingWebhookEvent.findMany({
        where: {
          appointmentId: { in: appointmentIds }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      })
    ]);

    const webhookFailures = recentWebhookEvents.filter(
      (event) => event.resultStatus === "failed"
    ).length;
    const pendingWebhookProcessing = recentWebhookEvents.filter(
      (event) => !event.processedAt
    ).length;
    const alerts = buildOperationalAlerts({
      failedReminders,
      retryableReminders,
      webhookFailures,
      pendingWebhookProcessing
    });

    return {
      failedReminders,
      remindersAwaitingRetry: retryableReminders,
      webhookFailures,
      pendingWebhookProcessing,
      highestSeverity: alerts.at(0)?.severity ?? "none",
      alerts,
      recentWebhookEvents: recentWebhookEvents.map(mapWebhookEventRecord)
    };
  }

  async create(
    input: {
      patientId: string;
      title: string;
      appointmentAt: string;
      durationMinutes?: number;
      notes?: string;
      telehealth?: boolean;
    },
    principal: AccessPrincipal
  ) {
    if (!principal.professionalId) {
      throw new UnauthorizedException("Perfil profissional nao vinculado a sessao");
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        organizationId: principal.organizationId,
        patientId: input.patientId,
        professionalId: principal.professionalId,
        title: input.title,
        appointmentAt: new Date(input.appointmentAt),
        durationMinutes: input.durationMinutes ?? 30,
        notes: input.notes,
        telehealth: input.telehealth ?? false
      },
      include: {
        patient: {
          select: {
            fullName: true
          }
        },
        billingEntries: true
      }
    });

    return mapAppointmentRecord(appointment);
  }

  async updateStatus(
    id: string,
    input: {
      status: Appointment["status"];
      notes?: string;
    },
    principal: AccessPrincipal
  ) {
    const existing = await this.prisma.appointment.findFirst({
      where: {
        id,
        ...buildAppointmentScope(principal)
      }
    });

    if (!existing) {
      throw new NotFoundException("Consulta nao encontrada");
    }

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: mapStatusToPrisma(input.status),
        notes: input.notes
      },
      include: {
        patient: {
          select: {
            fullName: true
          }
        },
        billingEntries: true
      }
    });

    return mapAppointmentRecord(appointment);
  }
}

function mapStatusToPrisma(status: Appointment["status"]) {
  switch (status) {
    case "confirmed":
      return "CONFIRMED";
    case "checked_in":
      return "CHECKED_IN";
    case "completed":
      return "COMPLETED";
    case "cancelled":
      return "CANCELLED";
    case "no_show":
      return "NO_SHOW";
    default:
      return "SCHEDULED";
  }
}

function mapStatusFromPrisma(status: string): Appointment["status"] {
  switch (status) {
    case "CONFIRMED":
      return "confirmed";
    case "CHECKED_IN":
      return "checked_in";
    case "COMPLETED":
      return "completed";
    case "CANCELLED":
      return "cancelled";
    case "NO_SHOW":
      return "no_show";
    default:
      return "scheduled";
  }
}

function mapAppointmentRecord(appointment: {
  id: string;
  patientId: string;
  professionalId: string;
  organizationId: string | null;
  title: string;
  status: string;
  appointmentAt: Date;
  durationMinutes: number;
  notes: string | null;
  telehealth: boolean;
  telehealthUrl: string | null;
  telehealthProvider: string | null;
  telehealthRoomId: string | null;
  createdAt: Date;
  updatedAt: Date;
  patient?: {
    fullName: string;
  };
  billingEntries?: Array<{
    id: string;
    appointmentId: string;
    status: string;
    amountCents: number;
    currency: string;
    description: string;
    paymentProvider: string | null;
    externalReference: string | null;
    authorizedAt: Date | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}) {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    professionalId: appointment.professionalId,
    organizationId: appointment.organizationId ?? undefined,
    title: appointment.title,
    status: mapStatusFromPrisma(appointment.status),
    appointmentAt: appointment.appointmentAt.toISOString(),
    durationMinutes: appointment.durationMinutes,
    notes: appointment.notes ?? undefined,
    telehealth: appointment.telehealth,
    telehealthUrl: appointment.telehealthUrl ?? undefined,
    telehealthProvider: appointment.telehealthProvider ?? undefined,
    telehealthRoomId: appointment.telehealthRoomId ?? undefined,
    billingEntries: (appointment.billingEntries ?? []).map((entry) => ({
      id: entry.id,
      appointmentId: entry.appointmentId,
      status: entry.status.toLowerCase() as NonNullable<
        Appointment["billingEntries"]
      >[number]["status"],
      amountCents: entry.amountCents,
      currency: entry.currency,
      description: entry.description,
      paymentProvider: entry.paymentProvider ?? undefined,
      externalReference: entry.externalReference ?? undefined,
      authorizedAt: entry.authorizedAt?.toISOString(),
      paidAt: entry.paidAt?.toISOString(),
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString()
    })),
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    patientName: appointment.patient?.fullName
  } satisfies Appointment;
}

function mapWebhookEventRecord(event: {
  id: string;
  appointmentId: string;
  billingId: string;
  eventId: string | null;
  providerReference: string | null;
  status: string;
  resultStatus: string | null;
  processedAt: Date | null;
  createdAt: Date;
}): AppointmentBillingWebhookEventSummary {
  return {
    id: event.id,
    appointmentId: event.appointmentId,
    billingId: event.billingId,
    eventId: event.eventId ?? undefined,
    providerReference: event.providerReference ?? undefined,
    status: event.status.toLowerCase() as AppointmentBillingWebhookEventSummary["status"],
    resultStatus: event.resultStatus ?? undefined,
    processedAt: event.processedAt?.toISOString(),
    createdAt: event.createdAt.toISOString()
  };
}

function buildOperationalAlerts(input: {
  failedReminders: number;
  retryableReminders: number;
  webhookFailures: number;
  pendingWebhookProcessing: number;
}) {
  const alerts: AppointmentOperationsSnapshot["alerts"] = [];

  if (input.failedReminders > 0) {
    alerts.push({
      code: "reminders.failed",
      severity: input.failedReminders >= 5 ? "high" : "medium",
      label: "Lembretes com falha",
      count: input.failedReminders,
      detail: "Existem lembretes que nao chegaram ao paciente."
    });
  }

  if (input.retryableReminders > 0) {
    alerts.push({
      code: "reminders.retry_pending",
      severity: input.retryableReminders >= 5 ? "medium" : "low",
      label: "Retries pendentes",
      count: input.retryableReminders,
      detail: "Ha lembretes aguardando nova tentativa automatica."
    });
  }

  if (input.webhookFailures > 0) {
    alerts.push({
      code: "billing.webhook_failed",
      severity: input.webhookFailures >= 3 ? "high" : "medium",
      label: "Webhooks falhos",
      count: input.webhookFailures,
      detail: "Eventos de cobranca falharam ao conciliar automaticamente."
    });
  }

  if (input.pendingWebhookProcessing > 0) {
    alerts.push({
      code: "billing.webhook_pending",
      severity: input.pendingWebhookProcessing >= 5 ? "medium" : "low",
      label: "Inbox pendente",
      count: input.pendingWebhookProcessing,
      detail: "Existem eventos externos aguardando processamento."
    });
  }

  return alerts.sort((left, right) => severityWeight(right.severity) - severityWeight(left.severity));
}

function severityWeight(value: "low" | "medium" | "high") {
  switch (value) {
    case "high":
      return 3;
    case "medium":
      return 2;
    default:
      return 1;
  }
}
