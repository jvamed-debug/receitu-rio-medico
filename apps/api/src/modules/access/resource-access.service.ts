import { Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";

import { PrismaService } from "../../persistence/prisma.service";
import { AuditService } from "../audit/audit.service";
import type { AccessPrincipal } from "../auth/auth.types";

@Injectable()
export class ResourceAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService
  ) {}

  async assertDocumentAccess(
    principal: AccessPrincipal,
    documentId: string,
    action: string
  ) {
    const document = await this.prisma.clinicalDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        patientId: true,
        authorProfessionalId: true,
        organizationId: true
      }
    });

    if (!document) {
      throw new NotFoundException("Documento nao encontrado");
    }

    if (this.canBypass(principal)) {
      return document;
    }

    if (!principal.professionalId) {
      throw new UnauthorizedException("Perfil profissional nao vinculado a sessao");
    }

    if (document.authorProfessionalId === principal.professionalId) {
      this.assertOrganizationAccess(principal.organizationId, document.organizationId);
      return document;
    }

    await this.logDeniedAccess(principal, "clinical_document", documentId, action, {
      reason: "document_not_owned_by_principal"
    });

    throw new NotFoundException("Documento nao encontrado");
  }

  async assertPatientAccess(
    principal: AccessPrincipal,
    patientId: string,
    action: string
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        primaryProfessionalId: true,
        organizationId: true
      }
    });

    if (!patient) {
      throw new NotFoundException("Paciente nao encontrado");
    }

    if (this.canBypass(principal)) {
      return patient;
    }

    if (!principal.professionalId) {
      throw new UnauthorizedException("Perfil profissional nao vinculado a sessao");
    }

    if (patient.primaryProfessionalId === principal.professionalId) {
      this.assertOrganizationAccess(principal.organizationId, patient.organizationId);
      return patient;
    }

    const hasDocumentAccess = await this.prisma.clinicalDocument.findFirst({
      where: {
        patientId,
        authorProfessionalId: principal.professionalId
      },
      select: { id: true }
    });

    if (hasDocumentAccess) {
      this.assertOrganizationAccess(principal.organizationId, patient.organizationId);
      return patient;
    }

    await this.logDeniedAccess(principal, "patient", patientId, action, {
      reason: "patient_outside_principal_scope"
    });

    throw new NotFoundException("Paciente nao encontrado");
  }

  buildPatientScope(principal: AccessPrincipal) {
    if (this.canBypass(principal)) {
      return undefined;
    }

    if (!principal.professionalId) {
      return {
        id: "__no_access__"
      };
    }

    return {
      OR: [
        {
          organizationId: principal.organizationId,
          primaryProfessionalId: principal.professionalId
        },
        {
          organizationId: principal.organizationId,
          documents: {
            some: {
              authorProfessionalId: principal.professionalId
            }
          }
        },
        {
          organizationId: null,
          primaryProfessionalId: principal.professionalId
        },
        {
          organizationId: null,
          documents: {
            some: {
              authorProfessionalId: principal.professionalId
            }
          }
        }
      ]
    };
  }

  private canBypass(principal: AccessPrincipal) {
    return principal.roles.some((role) => role === "admin" || role === "compliance");
  }

  private assertOrganizationAccess(
    principalOrganizationId: string | undefined,
    resourceOrganizationId: string | null
  ) {
    if (!resourceOrganizationId || !principalOrganizationId) {
      return;
    }

    if (principalOrganizationId !== resourceOrganizationId) {
      throw new NotFoundException("Recurso fora da organizacao da sessao");
    }
  }

  private async logDeniedAccess(
    principal: AccessPrincipal,
    entityType: string,
    entityId: string,
    action: string,
    metadata: Record<string, unknown>
  ) {
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType,
      entityId,
      action: "access_denied",
      origin: "api.access",
      metadata: {
        attemptedAction: action,
        actorRoles: principal.roles,
        ...metadata
      }
    });
  }
}
