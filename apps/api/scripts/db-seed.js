const {
  PrismaClient,
  DocumentType,
  DocumentStatus,
  ProfessionalStatus,
  SignatureProvider,
  UserRole
} = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("db:seed bootstrap");

  const user = await prisma.user.upsert({
    where: { email: "profissional.demo@receituario.local" },
    update: {
      fullName: "Dra. Helena Prado"
    },
    create: {
      email: "profissional.demo@receituario.local",
      passwordHash: "demo-password-hash",
      fullName: "Dra. Helena Prado",
      role: UserRole.PROFESSIONAL
    }
  });

  console.log("- usuario demo ok");

  const professional = await prisma.professionalProfile.upsert({
    where: { userId: user.id },
    update: {
      specialty: "Clinica Medica",
      status: ProfessionalStatus.ACTIVE,
      signatureProvider: SignatureProvider.ICP_BRASIL_VENDOR,
      signatureValidatedAt: new Date()
    },
    create: {
      userId: user.id,
      documentNumber: "123456",
      councilType: "CRM",
      councilState: "SP",
      cbo: "225125",
      specialty: "Clinica Medica",
      signatureProvider: SignatureProvider.ICP_BRASIL_VENDOR,
      signatureValidatedAt: new Date(),
      status: ProfessionalStatus.ACTIVE
    }
  });

  console.log("- profissional demo ok");

  const patient = await prisma.patient.upsert({
    where: { cpf: "12345678909" },
    update: {
      fullName: "Maria Clara Souza",
      cns: "898001160366090",
      birthDate: new Date("1990-05-20"),
      phone: "+55 11 99999-0000",
      email: "maria.clara@paciente.local",
      notes: "Paciente demo para validacao de jornada documental."
    },
    create: {
      fullName: "Maria Clara Souza",
      cpf: "12345678909",
      cns: "898001160366090",
      birthDate: new Date("1990-05-20"),
      phone: "+55 11 99999-0000",
      email: "maria.clara@paciente.local",
      notes: "Paciente demo para validacao de jornada documental."
    }
  });

  console.log("- paciente demo ok");

  const existingTemplate = await prisma.template.findFirst({
    where: {
      name: "Receita simples padrao",
      type: DocumentType.PRESCRIPTION,
      version: 1
    }
  });

  const template =
    existingTemplate ??
    (await prisma.template.create({
      data: {
        name: "Receita simples padrao",
        type: DocumentType.PRESCRIPTION,
        version: 1,
        structure: {
          sections: ["identificacao", "paciente", "itens", "orientacoes", "assinatura"],
          defaults: {
            layoutVersion: "v1",
            showActiveIngredient: true
          }
        }
      }
    }));

  console.log("- template padrao ok");

  const existingDocument = await prisma.clinicalDocument.findFirst({
    where: {
      patientId: patient.id,
      authorProfessionalId: professional.id,
      title: "Receita inicial de demonstracao"
    }
  });

  if (!existingDocument) {
    await prisma.clinicalDocument.create({
      data: {
        type: DocumentType.PRESCRIPTION,
        status: DocumentStatus.DRAFT,
        patientId: patient.id,
        authorProfessionalId: professional.id,
        title: "Receita inicial de demonstracao",
        layoutVersion: "v1",
        payload: {
          items: [
            {
              medicationName: "Dipirona 500 mg",
              activeIngredient: "Dipirona sodica",
              dosage: "1 comprimido",
              frequency: "a cada 6 horas",
              duration: "3 dias",
              quantity: "12 comprimidos"
            }
          ],
          templateId: template.id
        }
      }
    });
  }

  console.log("- documento demo ok");
}

main()
  .catch((error) => {
    console.error("db:seed error");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
