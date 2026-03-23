import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Patient, PatientClinicalProfile } from "@receituario/domain";

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
