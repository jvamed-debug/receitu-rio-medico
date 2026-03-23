import { Injectable, NotFoundException } from "@nestjs/common";
import type { Appointment } from "@receituario/domain";

import { PrismaService } from "../../../persistence/prisma.service";
import { AuditService } from "../../audit/audit.service";
import type { AccessPrincipal } from "../../auth/auth.types";

@Injectable()
export class TelehealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async ensureRoom(appointmentId: string, principal: AccessPrincipal) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        patient: {
          select: {
            fullName: true
          }
        },
        billingEntries: true
      }
    });

    if (!appointment) {
      throw new NotFoundException("Consulta nao encontrada");
    }

    const roomId = appointment.telehealthRoomId ?? `tele-${appointment.id}`;
    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        telehealth: true,
        telehealthProvider: appointment.telehealthProvider ?? "bluecare-meet",
        telehealthRoomId: roomId,
        telehealthUrl:
          appointment.telehealthUrl ??
          `https://telemed.receituario.local/rooms/${roomId}`
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

    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "appointment",
      entityId: appointmentId,
      action: "telehealth_room_provisioned",
      origin: "api.telehealth",
      metadata: {
        telehealthProvider: updated.telehealthProvider,
        telehealthRoomId: updated.telehealthRoomId,
        telehealthUrl: updated.telehealthUrl
      }
    });

    return mapAppointmentRecord(updated);
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

function mapBilling(
  entries: Array<{
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
  }>
) {
  return entries.map((entry) => ({
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
  }));
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
  patient: {
    fullName: string;
  };
  billingEntries: Array<{
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
    billingEntries: mapBilling(appointment.billingEntries),
    createdAt: appointment.createdAt.toISOString(),
    updatedAt: appointment.updatedAt.toISOString(),
    patientName: appointment.patient.fullName
  } satisfies Appointment;
}
