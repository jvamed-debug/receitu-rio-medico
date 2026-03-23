import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AppointmentReminder, Appointment } from "@receituario/domain";

import { PrismaService } from "../../../persistence/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { AccessPrincipal } from "../../auth/auth.types";
import { ReminderProviderGateway } from "./reminder-provider.gateway";

@Injectable()
export class AppointmentRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly reminderProviderGateway: ReminderProviderGateway
  ) {}

  async listByAppointment(appointmentId: string) {
    const reminders = await this.prisma.appointmentReminder.findMany({
      where: { appointmentId },
      orderBy: { scheduledFor: "asc" }
    });

    return reminders.map(mapReminderRecord);
  }

  async scheduleReminder(
    appointmentId: string,
    input: {
      channel: "email" | "sms" | "whatsapp";
      scheduledFor: string;
      message?: string;
    },
    principal: AccessPrincipal
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            fullName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!appointment) {
      throw new NotFoundException("Consulta nao encontrada");
    }

    const target = resolveReminderTarget(appointment, input.channel);

    if (!target) {
      throw new BadRequestException(
        "Paciente sem destino valido para o canal de lembrete selecionado"
      );
    }

    const reminder = await this.prisma.appointmentReminder.create({
      data: {
        appointmentId,
        channel: input.channel,
        target,
        scheduledFor: new Date(input.scheduledFor),
        message:
          input.message?.trim() ||
          buildDefaultReminderMessage({
            patientName: appointment.patient.fullName,
            appointmentTitle: appointment.title,
            appointmentAt: appointment.appointmentAt.toISOString(),
            telehealth: appointment.telehealth
          }),
        metadata: {
          createdByProfessionalId: principal.professionalId,
          appointmentStatus: appointment.status
        }
      }
    });

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment_reminder",
      entityId: reminder.id,
      action: "appointment_reminder_scheduled",
      origin: "api.appointments",
      metadata: {
        appointmentId,
        channel: reminder.channel,
        scheduledFor: reminder.scheduledFor.toISOString()
      }
    });

    return mapReminderRecord(reminder);
  }

  async dispatchReminder(
    appointmentId: string,
    reminderId: string,
    principal: AccessPrincipal
  ) {
    const reminder = await this.prisma.appointmentReminder.findFirst({
      where: {
        id: reminderId,
        appointmentId
      }
    });

    if (!reminder) {
      throw new NotFoundException("Lembrete nao encontrado");
    }

    return this.dispatchReminderRecord(reminder, principal);
  }

  async retryReminder(
    appointmentId: string,
    reminderId: string,
    principal: AccessPrincipal
  ) {
    const reminder = await this.prisma.appointmentReminder.findFirst({
      where: {
        id: reminderId,
        appointmentId
      }
    });

    if (!reminder) {
      throw new NotFoundException("Lembrete nao encontrado");
    }

    if (reminder.status !== "FAILED") {
      throw new BadRequestException("Apenas lembretes com falha podem ser reenviados");
    }

    return this.dispatchReminderRecord(reminder, principal);
  }

  private async dispatchReminderRecord(
    reminder: {
      id: string;
      appointmentId: string;
      channel: string;
      status?: string;
      target: string | null;
      scheduledFor?: Date;
      sentAt?: Date | null;
      nextAttemptAt?: Date | null;
      attemptCount?: number;
      lastError?: string | null;
      message?: string;
      metadata?: unknown;
    },
    principal: AccessPrincipal
  ) {
    try {
      const sentReminder = await this.prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: await buildReminderDispatchUpdate(
          reminder,
          principal,
          this.reminderProviderGateway
        )
      });

      await this.auditService.log({
        actorUserId: principal.userId,
        actorProfessionalId: principal.professionalId,
        entityType: "appointment_reminder",
        entityId: reminder.id,
        action: "appointment_reminder_sent",
        origin: "api.appointments",
        metadata: {
          appointmentId: reminder.appointmentId,
          channel: sentReminder.channel,
          target: sentReminder.target,
          attemptCount: sentReminder.attemptCount
        }
      });

      return mapReminderRecord(sentReminder);
    } catch (error) {
      const failedReminder = await this.prisma.appointmentReminder.update({
        where: { id: reminder.id },
        data: buildReminderFailureUpdate(reminder, error)
      });

      await this.auditService.log({
        actorUserId: principal.userId,
        actorProfessionalId: principal.professionalId,
        entityType: "appointment_reminder",
        entityId: reminder.id,
        action: "appointment_reminder_failed",
        origin: "api.appointments",
        metadata: {
          appointmentId: reminder.appointmentId,
          channel: failedReminder.channel,
          target: failedReminder.target,
          attemptCount: failedReminder.attemptCount,
          lastError: failedReminder.lastError
        }
      });

      return mapReminderRecord(failedReminder);
    }
  }
}

async function buildReminderDispatchUpdate(
  reminder: {
    id: string;
    appointmentId: string;
    channel: string;
    target: string | null;
    scheduledFor?: Date;
    message?: string;
    attemptCount?: number;
    metadata?: unknown;
  },
  principal: AccessPrincipal,
  reminderProviderGateway: ReminderProviderGateway
) {
  if (!reminder.target || !reminder.message || !reminder.scheduledFor) {
    throw new BadRequestException("Lembrete sem dados suficientes para envio");
  }

  const dispatch = await reminderProviderGateway.dispatch({
    reminderId: reminder.id,
    appointmentId: reminder.appointmentId,
    channel: reminder.channel as "email" | "sms" | "whatsapp",
    target: reminder.target,
    message: reminder.message,
    scheduledFor: reminder.scheduledFor.toISOString()
  });

  return {
    status: "SENT" as const,
    sentAt: new Date(dispatch.deliveredAt),
    nextAttemptAt: null,
    lastError: null,
    attemptCount: (reminder.attemptCount ?? 0) + 1,
    metadata: normalizeJsonRecord({
      ...(typeof reminder.metadata === "object" && reminder.metadata ? reminder.metadata : {}),
      dispatchedByProfessionalId: principal.professionalId,
      dispatchMode: "provider",
      providerReference: dispatch.providerReference,
      providerMetadata: normalizeJsonRecord(dispatch.providerMetadata)
    })
  };
}

function buildReminderFailureUpdate(
  reminder: {
    attemptCount?: number;
    metadata?: unknown;
  },
  error: unknown
) {
  const nextAttemptCount = (reminder.attemptCount ?? 0) + 1;
  const lastError =
    error instanceof Error ? error.message : "Falha ao enviar lembrete";
  const canRetry = nextAttemptCount < 3;

  return {
    status: "FAILED" as const,
    sentAt: null,
    attemptCount: nextAttemptCount,
    lastError,
    nextAttemptAt: canRetry ? new Date(Date.now() + 15 * 60 * 1000) : null,
    metadata: normalizeJsonRecord({
      ...(typeof reminder.metadata === "object" && reminder.metadata ? reminder.metadata : {}),
      lastDispatchError: lastError
    })
  };
}

function normalizeJsonRecord(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function resolveReminderTarget(
  appointment: {
    patient: {
      email: string | null;
      phone: string | null;
    };
  },
  channel: "email" | "sms" | "whatsapp"
) {
  if (channel === "email") {
    return appointment.patient.email;
  }

  return appointment.patient.phone;
}

function buildDefaultReminderMessage(input: {
  patientName: string;
  appointmentTitle: string;
  appointmentAt: string;
  telehealth: boolean;
}) {
  const when = new Date(input.appointmentAt).toLocaleString("pt-BR");
  const modality = input.telehealth ? "teleconsulta" : "consulta presencial";
  return `Lembrete: ${input.patientName}, voce possui ${input.appointmentTitle} (${modality}) agendada para ${when}.`;
}

function mapReminderRecord(reminder: {
  id: string;
  appointmentId: string;
  channel: string;
  status: string;
  target: string | null;
  scheduledFor: Date;
  sentAt: Date | null;
  nextAttemptAt?: Date | null;
  attemptCount?: number;
  lastError?: string | null;
  message: string;
  createdAt: Date;
  updatedAt: Date;
}): AppointmentReminder {
  return {
    id: reminder.id,
    appointmentId: reminder.appointmentId,
    channel: reminder.channel as AppointmentReminder["channel"],
    status: reminder.status.toLowerCase() as AppointmentReminder["status"],
    target: reminder.target ?? undefined,
    scheduledFor: reminder.scheduledFor.toISOString(),
    sentAt: reminder.sentAt?.toISOString(),
    nextAttemptAt: reminder.nextAttemptAt?.toISOString(),
    attemptCount: reminder.attemptCount ?? 0,
    lastError: reminder.lastError ?? undefined,
    message: reminder.message,
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString()
  };
}
