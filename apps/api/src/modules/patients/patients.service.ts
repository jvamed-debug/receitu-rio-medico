import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Patient } from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";
import type { AccessPrincipal } from "../auth/auth.types";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(where?: Prisma.PatientWhereInput) {
    const patients = await this.prisma.patient.findMany({
      where,
      orderBy: {
        createdAt: "desc"
      }
    });

    return patients.map((patient) => ({
      ...patient,
      birthDate: patient.birthDate?.toISOString()
    }));
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

    return {
      ...patient,
      birthDate: patient.birthDate?.toISOString()
    };
  }

  async getById(id: string, where?: Prisma.PatientWhereInput) {
    const patient = await this.prisma.patient.findFirst({
      where: {
        AND: [{ id }, ...(where ? [where] : [])]
      }
    });

    if (!patient) {
      return null;
    }

    return {
      ...patient,
      birthDate: patient.birthDate?.toISOString()
    };
  }
}
