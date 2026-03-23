import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AppointmentReminder, Appointment } from "@receituario/domain";

import { PrismaService } from "../../../persistence/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { AccessPrincipal } from "../../auth/auth.types";

@Injectable()
export class AppointmentRemindersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
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

    const sentReminder = await this.prisma.appointmentReminder.update({
      where: { id: reminderId },
      data: {
        status: "SENT",
        sentAt: new Date(),
        metadata: {
          ...(typeof reminder.metadata === "object" && reminder.metadata ? reminder.metadata : {}),
          dispatchedByProfessionalId: principal.professionalId,
          dispatchMode: "mock-transactional"
        }
      }
    });

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment_reminder",
      entityId: reminderId,
      action: "appointment_reminder_sent",
      origin: "api.appointments",
      metadata: {
        appointmentId,
        channel: sentReminder.channel,
        target: sentReminder.target
      }
    });

    return mapReminderRecord(sentReminder);
  }
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
    message: reminder.message,
    createdAt: reminder.createdAt.toISOString(),
    updatedAt: reminder.updatedAt.toISOString()
  };
}
