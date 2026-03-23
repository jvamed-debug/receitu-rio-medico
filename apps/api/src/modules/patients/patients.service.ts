import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  Patient,
  PatientClinicalProfile,
  PatientEncounter,
  PatientTimelineEntry
} from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import type { AccessPrincipal } from "../auth/auth.types";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(where?: Prisma.PatientWhereInput) {
    const patients = await this.prisma.patient.findMany({
      where,
      include: {
        clinicalProfile: true
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return patients.map(mapPatientRecord);
  }

  async create(
    input: Omit<Patient, "id" | "createdAt" | "updatedAt">,
    principal: AccessPrincipal
  ) {
    const patient = await this.prisma.patient.create({
      data: {
        fullName: input.fullName,
        cpf: input.cpf,
        cns: input.cns,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        phone: input.phone,
        email: input.email,
        notes: input.notes,
        primaryProfessionalId: principal.professionalId,
        organizationId: principal.organizationId
      }
    });

    return mapPatientRecord(patient);
  }

  async getById(id: string, where?: Prisma.PatientWhereInput) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        AND: [{ id }, ...(where ? [where] : [])]
      },
      include: {
        clinicalProfile: true
      }
    });

    if (!patient) {
      return null;
    }

    return mapPatientRecord(patient);
  }

  async upsertClinicalProfile(
    patientId: string,
    input: PatientClinicalProfile,
    principal: AccessPrincipal
  ) {
    const profile = await this.prisma.patientClinicalProfile.upsert({
      where: {
        patientId
      },
      create: {
        patientId,
        allergies: input.allergies as unknown as Prisma.InputJsonValue,
        conditions: input.conditions as unknown as Prisma.InputJsonValue,
        chronicMedications:
          input.chronicMedications as unknown as Prisma.InputJsonValue,
        carePlan: input.carePlan as unknown as Prisma.InputJsonValue,
        summary: input.summary ?? null,
        reviewedByProfessionalId: principal.professionalId,
        reviewedAt: new Date()
      },
      update: {
        allergies: input.allergies as unknown as Prisma.InputJsonValue,
        conditions: input.conditions as unknown as Prisma.InputJsonValue,
        chronicMedications:
          input.chronicMedications as unknown as Prisma.InputJsonValue,
        carePlan: input.carePlan as unknown as Prisma.InputJsonValue,
        summary: input.summary ?? null,
        reviewedByProfessionalId: principal.professionalId,
        reviewedAt: new Date()
      }
    });

    return mapClinicalProfile(profile);
  }

  async listEncounters(patientId: string) {
    const encounters = await this.prisma.patientEncounter.findMany({
      where: {
        patientId
      },
      orderBy: {
        occurredAt: "desc"
      }
    });

    return encounters.map(mapEncounter);
  }

  async createEncounter(
    patientId: string,
    input: {
      type?: PatientEncounter["type"];
      title: string;
      summary?: string;
      notes?: string;
      occurredAt?: string;
    },
    principal: AccessPrincipal
  ) {
    if (!principal.professionalId) {
      throw new ForbiddenException("Encounter clinico exige profissional autenticado");
    }

    const encounter = await this.prisma.patientEncounter.create({
      data: {
        patientId,
        organizationId: principal.organizationId,
        professionalId: principal.professionalId,
        type: toEncounterType(input.type),
        title: input.title,
        summary: input.summary ?? null,
        notes: input.notes ?? null,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date()
      }
    });

    return mapEncounter(encounter);
  }

  async getTimeline(patientId: string) {
    const [encounters, documents, appointments] = await Promise.all([
      this.prisma.patientEncounter.findMany({
        where: {
          patientId
        },
        orderBy: {
          occurredAt: "desc"
        }
      }),
      this.prisma.clinicalDocument.findMany({
        where: {
          patientId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 50
      }),
      this.prisma.appointment.findMany({
        where: {
          patientId
        },
        orderBy: {
          appointmentAt: "desc"
        },
        take: 50
      })
    ]);

    const items: PatientTimelineEntry[] = [
      ...encounters.map<PatientTimelineEntry>((encounter) => ({
        id: `encounter:${encounter.id}`,
        sourceType: "encounter",
        sourceId: encounter.id,
        patientId: encounter.patientId,
        title: encounter.title,
        subtitle: encounter.type.toLowerCase(),
        occurredAt: encounter.occurredAt.toISOString(),
        summary: encounter.summary ?? encounter.notes ?? undefined,
        metadata:
          encounter.metadata && typeof encounter.metadata === "object"
            ? (encounter.metadata as Record<string, unknown>)
            : undefined
      })),
      ...documents.map<PatientTimelineEntry>((document) => ({
        id: `document:${document.id}`,
        sourceType: "document",
        sourceId: document.id,
        patientId: document.patientId,
        title: document.title,
        subtitle: document.type.toLowerCase(),
        occurredAt: (document.issuedAt ?? document.createdAt).toISOString(),
        status: document.status.toLowerCase(),
        summary: summarizeDocumentPayload(document.payload),
        metadata: {
          layoutVersion: document.layoutVersion
        }
      })),
      ...appointments.map<PatientTimelineEntry>((appointment) => ({
        id: `appointment:${appointment.id}`,
        sourceType: "appointment",
        sourceId: appointment.id,
        patientId: appointment.patientId,
        title: appointment.title,
        subtitle: appointment.telehealth ? "telehealth" : "appointment",
        occurredAt: appointment.appointmentAt.toISOString(),
        status: appointment.status.toLowerCase(),
        summary: appointment.notes ?? undefined,
        metadata: {
          durationMinutes: appointment.durationMinutes
        }
      }))
    ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

    return {
      patientId,
      items
    };
  }
}

function mapPatientRecord(
  patient: {
    id: string;
    fullName: string;
    cpf: string | null;
    cns: string | null;
    birthDate: Date | null;
    phone: string | null;
    email: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
    clinicalProfile?: {
      allergies: Prisma.JsonValue | null;
      conditions: Prisma.JsonValue | null;
      chronicMedications: Prisma.JsonValue | null;
      carePlan: Prisma.JsonValue | null;
      summary: string | null;
      reviewedByProfessionalId: string | null;
      reviewedAt: Date | null;
    } | null;
  }
) {
  return {
    ...patient,
    birthDate: patient.birthDate?.toISOString(),
    clinicalProfile: patient.clinicalProfile
      ? mapClinicalProfile(patient.clinicalProfile)
      : undefined
  };
}

function mapClinicalProfile(profile: {
  allergies: Prisma.JsonValue | null;
  conditions: Prisma.JsonValue | null;
  chronicMedications: Prisma.JsonValue | null;
  carePlan: Prisma.JsonValue | null;
  summary: string | null;
  reviewedByProfessionalId: string | null;
  reviewedAt: Date | null;
}) {
  return {
    allergies: Array.isArray(profile.allergies) ? profile.allergies : [],
    conditions: Array.isArray(profile.conditions) ? profile.conditions : [],
    chronicMedications: Array.isArray(profile.chronicMedications)
      ? profile.chronicMedications
      : [],
    carePlan: Array.isArray(profile.carePlan) ? profile.carePlan : [],
    summary: profile.summary ?? undefined,
    reviewedByProfessionalId: profile.reviewedByProfessionalId ?? undefined,
    reviewedAt: profile.reviewedAt?.toISOString()
  };
}

function mapEncounter(encounter: {
  id: string;
  patientId: string;
  organizationId: string | null;
  professionalId: string;
  type: string;
  title: string;
  summary: string | null;
  notes: string | null;
  occurredAt: Date;
  metadata: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}): PatientEncounter {
  return {
    id: encounter.id,
    patientId: encounter.patientId,
    organizationId: encounter.organizationId ?? undefined,
    professionalId: encounter.professionalId,
    type: encounter.type.toLowerCase() as PatientEncounter["type"],
    title: encounter.title,
    summary: encounter.summary ?? undefined,
    notes: encounter.notes ?? undefined,
    occurredAt: encounter.occurredAt.toISOString(),
    metadata:
      encounter.metadata && typeof encounter.metadata === "object"
        ? (encounter.metadata as Record<string, unknown>)
        : undefined,
    createdAt: encounter.createdAt.toISOString(),
    updatedAt: encounter.updatedAt.toISOString()
  };
}

function toEncounterType(type?: PatientEncounter["type"]) {
  switch (type) {
    case "consultation":
      return "CONSULTATION" as const;
    case "follow_up":
      return "FOLLOW_UP" as const;
    case "telehealth":
      return "TELEHEALTH" as const;
    case "triage":
      return "TRIAGE" as const;
    case "procedure":
      return "PROCEDURE" as const;
    default:
      return "CLINICAL_NOTE" as const;
  }
}

function summarizeDocumentPayload(payload: Prisma.JsonValue) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.items)) {
    return `${record.items.length} item(ns) registrados`;
  }

  if (Array.isArray(record.requestedExams)) {
    return `${record.requestedExams.length} exame(s) solicitados`;
  }

  if (typeof record.purpose === "string") {
    return record.purpose;
  }

  if (typeof record.body === "string") {
    return record.body.slice(0, 140);
  }

  return undefined;
}
