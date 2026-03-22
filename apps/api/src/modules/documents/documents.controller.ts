import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UnauthorizedException,
  UseGuards
} from "@nestjs/common";

import { AuditService } from "../audit/audit.service";
import { ResourceAccessService } from "../access/resource-access.service";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import { AuthGuard } from "../auth/auth.guard";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import type { AccessPrincipal } from "../auth/auth.types";
import { DeliveryService } from "../delivery/delivery.service";
import {
  CreateExamRequestDto,
  CreateFreeDocumentDto,
  CreateMedicalCertificateDto,
  CreatePrescriptionDto
} from "./dto/create-document.dto";
import { DocumentsService } from "./documents.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller("documents")
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly auditService: AuditService,
    private readonly deliveryService: DeliveryService,
    private readonly resourceAccessService: ResourceAccessService
  ) {}

  @Get()
  list(@CurrentPrincipal() principal: AccessPrincipal) {
    return this.documentsService.listForProfessional(scopeProfessionalId(principal));
  }

  @RequireRoles("professional", "admin")
  @Post("prescriptions")
  async createPrescription(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body() input: CreatePrescriptionDto
  ) {
    ensureProfessionalPrincipal(principal);
    const document = await this.documentsService.createPrescription({
      ...input,
      patientId: input.patientId,
      authorProfessionalId: principal.professionalId ?? ""
    });
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "clinical_document",
      entityId: document.id,
      action: "document_created",
      origin: "api.documents",
      metadata: {
        type: document.type,
        status: document.status
      }
    });
    return document;
  }

  @RequireRoles("professional", "admin")
  @Post("exam-requests")
  async createExamRequest(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body() input: CreateExamRequestDto
  ) {
    ensureProfessionalPrincipal(principal);
    const document = await this.documentsService.createExamRequest({
      ...input,
      patientId: input.patientId,
      authorProfessionalId: principal.professionalId ?? ""
    });
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "clinical_document",
      entityId: document.id,
      action: "document_created",
      origin: "api.documents",
      metadata: {
        type: document.type,
        status: document.status
      }
    });
    return document;
  }

  @RequireRoles("professional", "admin")
  @Post("certificates")
  async createMedicalCertificate(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body() input: CreateMedicalCertificateDto
  ) {
    ensureProfessionalPrincipal(principal);
    const document = await this.documentsService.createMedicalCertificate({
      ...input,
      patientId: input.patientId,
      authorProfessionalId: principal.professionalId ?? ""
    });
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "clinical_document",
      entityId: document.id,
      action: "document_created",
      origin: "api.documents",
      metadata: {
        type: document.type,
        status: document.status
      }
    });
    return document;
  }

  @RequireRoles("professional", "admin")
  @Post("free")
  async createFreeDocument(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body() input: CreateFreeDocumentDto
  ) {
    ensureProfessionalPrincipal(principal);
    const document = await this.documentsService.createFreeDocument({
      ...input,
      patientId: input.patientId,
      authorProfessionalId: principal.professionalId ?? ""
    });
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "clinical_document",
      entityId: document.id,
      action: "document_created",
      origin: "api.documents",
      metadata: {
        type: document.type,
        status: document.status
      }
    });
    return document;
  }

  @Get(":id")
  async getById(@CurrentPrincipal() principal: AccessPrincipal, @Param("id") id: string) {
    await this.resourceAccessService.assertDocumentAccess(principal, id, "document_read");
    return this.documentsService.getById(id);
  }

  @RequireRoles("professional", "admin")
  @Post(":id/duplicate")
  async duplicate(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertDocumentAccess(principal, id, "document_duplicate");
    const duplicateDocument = await this.documentsService.duplicate(id);
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "clinical_document",
      entityId: duplicateDocument.id,
      action: "document_duplicated",
      origin: "api.documents",
      metadata: {
        derivedFromDocumentId: id,
        type: duplicateDocument.type,
        status: duplicateDocument.status
      }
    });
    return duplicateDocument;
  }

  @Get(":id/pdf")
  async getPdf(@CurrentPrincipal() principal: AccessPrincipal, @Param("id") id: string) {
    await this.resourceAccessService.assertDocumentAccess(principal, id, "document_pdf_preview");
    return this.documentsService.getPdfPreview(id);
  }

  @Post(":id/deliver/email")
  async deliverByEmail(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body() input: { email: string }
  ) {
    await this.resourceAccessService.assertDocumentAccess(principal, id, "document_deliver_email");
    const deliveryEvent = await this.deliveryService.deliverByEmail({
      documentId: id,
      email: input.email
    });
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "clinical_document",
      entityId: id,
      action: "document_delivery_requested",
      origin: "api.documents",
      metadata: {
        deliveryEventId: deliveryEvent.id,
        channel: deliveryEvent.channel,
        target: deliveryEvent.target,
        status: deliveryEvent.status
      }
    });
    return deliveryEvent;
  }

  @Post(":id/deliver/share-link")
  async createShareLink(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertDocumentAccess(principal, id, "document_share_link");
    const shareLink = await this.deliveryService.createShareLink({
      documentId: id
    });
    await this.auditService.log({
      actorUserId: principal.userId,
      actorProfessionalId: principal.professionalId,
      entityType: "clinical_document",
      entityId: id,
      action: "document_share_link_generated",
      origin: "api.documents",
      metadata: {
        deliveryEventId: shareLink.id,
        url: shareLink.url,
        status: shareLink.status
      }
    });
    return shareLink;
  }
}

function ensureProfessionalPrincipal(principal: { professionalId?: string }) {
  if (!principal.professionalId) {
    throw new UnauthorizedException("Perfil profissional nao vinculado a sessao");
  }
}

function scopeProfessionalId(principal: { professionalId?: string; roles?: string[] }) {
  return principal.roles?.some((role) => role == "admin" || role == "compliance")
    ? undefined
    : principal.professionalId;
}
