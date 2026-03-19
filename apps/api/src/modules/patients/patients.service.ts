import { Injectable } from "@nestjs/common";
import type { Patient } from "@receituario/domain";

import { PrismaService } from "../../persistence/prisma.service";

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const patients = await this.prisma.patient.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });

    return patients.map((patient) => ({
      ...patient,
      birthDate: patient.birthDate?.toISOString()
    }));
  }

  async create(input: Omit<Patient, "id" | "createdAt" | "updatedAt">) {
    const patient = await this.prisma.patient.create({
      data: {
        fullName: input.fullName,
        cpf: input.cpf,
        cns: input.cns,
        birthDate: input.birthDate ? new Date(input.birthDate) : undefined,
        phone: input.phone,
        email: input.email,
        notes: input.notes
      }
    });

    return {
      ...patient,
      birthDate: patient.birthDate?.toISOString()
    };
  }

  async getById(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id }
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

