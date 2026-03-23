import { ForbiddenException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type {
  Patient,
  PatientClinicalProfile,
  PatientEncounter,
  PatientEvolution,
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

  async listEvolutions(patientId: string) {
    const evolutions = await this.prisma.patientEvolution.findMany({
      where: {
        patientId
      },
      orderBy: {
        occurredAt: "desc"
      }
    });

    return evolutions.map(mapEvolution);
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

  async createEvolution(
    patientId: string,
    input: {
      encounterId?: string;
      title: string;
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      tags?: string[];
      occurredAt?: string;
    },
    principal: AccessPrincipal
  ) {
    if (!principal.professionalId) {
      throw new ForbiddenException("Evolucao clinica exige profissional autenticado");
    }

    const evolution = await this.prisma.patientEvolution.create({
      data: {
        patientId,
        organizationId: principal.organizationId,
        professionalId: principal.professionalId,
        encounterId: input.encounterId ?? null,
        title: input.title,
        subjective: input.subjective ?? null,
        objective: input.objective ?? null,
        assessment: input.assessment ?? null,
        plan: input.plan ?? null,
        tags: (input.tags ?? []) as Prisma.InputJsonValue,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date()
      }
    });

    return mapEvolution(evolution);
  }

  async getTimeline(patientId: string) {
    const [encounters, evolutions, documents, appointments] = await Promise.all([
      this.prisma.patientEncounter.findMany({
        where: {
          patientId
        },
        orderBy: {
          occurredAt: "desc"
        }
      }),
      this.prisma.patientEvolution.findMany({
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
      ...evolutions.map<PatientTimelineEntry>((evolution) => ({
        id: `evolution:${evolution.id}`,
        sourceType: "evolution",
        sourceId: evolution.id,
        patientId: evolution.patientId,
        title: evolution.title,
        subtitle: evolution.encounterId ? "evolution-linked-encounter" : "clinical-evolution",
        occurredAt: evolution.occurredAt.toISOString(),
        summary: buildEvolutionSummary(evolution),
        metadata: {
          encounterId: evolution.encounterId ?? undefined,
          tags: Array.isArray(evolution.tags)
            ? evolution.tags.filter((item): item is string => typeof item === "string")
            : []
        }
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

function mapEvolution(evolution: {
  id: string;
  patientId: string;
  organizationId: string | null;
  professionalId: string;
  encounterId: string | null;
  title: string;
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
  tags: Prisma.JsonValue | null;
  occurredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}): PatientEvolution {
  return {
    id: evolution.id,
    patientId: evolution.patientId,
    organizationId: evolution.organizationId ?? undefined,
    professionalId: evolution.professionalId,
    encounterId: evolution.encounterId ?? undefined,
    title: evolution.title,
    subjective: evolution.subjective ?? undefined,
    objective: evolution.objective ?? undefined,
    assessment: evolution.assessment ?? undefined,
    plan: evolution.plan ?? undefined,
    tags: Array.isArray(evolution.tags)
      ? evolution.tags.filter((item): item is string => typeof item === "string")
      : undefined,
    occurredAt: evolution.occurredAt.toISOString(),
    createdAt: evolution.createdAt.toISOString(),
    updatedAt: evolution.updatedAt.toISOString()
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
  const content =
    record._content && typeof record._content === "object"
      ? (record._content as Record<string, unknown>)
      : record;

  if (Array.isArray(content.items)) {
    return `${content.items.length} item(ns) registrados`;
  }

  if (Array.isArray(content.requestedExams)) {
    return `${content.requestedExams.length} exame(s) solicitados`;
  }

  if (typeof content.purpose === "string") {
    return content.purpose;
  }

  if (typeof content.body === "string") {
    return content.body.slice(0, 140);
  }

  return undefined;
}

function buildEvolutionSummary(evolution: {
  subjective: string | null;
  objective: string | null;
  assessment: string | null;
  plan: string | null;
}) {
  return [
    evolution.subjective ? `S: ${evolution.subjective}` : null,
    evolution.objective ? `O: ${evolution.objective}` : null,
    evolution.assessment ? `A: ${evolution.assessment}` : null,
    evolution.plan ? `P: ${evolution.plan}` : null
  ]
    .filter((item): item is string => Boolean(item))
    .join("\n");
}
