import {
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import type { Appointment } from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import type { AccessPrincipal } from "../auth/auth.types";

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(principal: AccessPrincipal) {
    const appointments = await this.prisma.appointment.findMany({
      where: buildAppointmentScope(principal),
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

function buildAppointmentScope(principal: AccessPrincipal) {
  if (principal.roles.some((role) => role === "admin" || role === "compliance")) {
    return undefined;
  }

  return {
    organizationId: principal.organizationId ?? null,
    professionalId: principal.professionalId ?? "__no_access__"
  };
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
