import {
  Body,
  Controller,
  Get,
  Query,
  Param,
  Post,
  Req,
  UseGuards
} from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ensureRecentStepUp } from "../auth/step-up.util";
import { ResourceAccessService } from "../access/resource-access.service";
import { SignatureProvider } from "@prisma/client";
import { SignatureProviderGateway } from "./signature-provider.gateway";
import { SignatureService } from "./signature.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class SignatureController {
  constructor(
    private readonly signatureService: SignatureService,
    private readonly resourceAccessService: ResourceAccessService,
    private readonly signatureProviderGateway: SignatureProviderGateway
  ) {}

  @RequireRoles("professional", "admin")
  @Post("signature/sessions")
  async createSession(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Body() input: { documentId: string; provider: string }
  ) {
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      input.documentId,
      "signature_session_create"
    );
    return this.signatureService.createSession({
      professionalId: principal.professionalId ?? "",
      documentId: input.documentId,
      provider: input.provider
    });
  }

  @RequireRoles("professional", "admin")
  @Post("signature/windows")
  createWindow(
    @CurrentPrincipal() principal: { professionalId?: string },
    @Body() input: { durationMinutes: number }
  ) {
    return this.signatureService.createWindow({
      professionalId: principal.professionalId ?? "",
      durationMinutes: input.durationMinutes
    });
  }

  @RequireRoles("professional", "admin")
  @Get("signature/windows/active")
  getActiveWindow(
    @CurrentPrincipal() principal: { professionalId?: string }
  ) {
    return (
      this.signatureService.getActiveWindow(principal.professionalId ?? "") ?? {
        active: false
      }
    );
  }

  @RequireRoles("professional", "admin")
  @Post("documents/:id/sign")
  async signDocument(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body() input: { provider?: string },
    @Req() request: { ip?: string; headers: Record<string, string | string[] | undefined> }
  ) {
    ensureRecentStepUp(principal, "sign_document");
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      id,
      "document_sign"
    );
    return this.signatureService.signDocument({
      professionalId: principal.professionalId ?? "",
      documentId: id,
      provider: input.provider,
      requestContext: {
        ip: request.ip,
        userAgent: Array.isArray(request.headers["user-agent"])
          ? request.headers["user-agent"][0]
          : request.headers["user-agent"],
        origin: Array.isArray(request.headers.origin)
          ? request.headers.origin[0]
          : request.headers.origin
      }
    });
  }

  @Get("documents/:id/signatures")
  async listDocumentSessions(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      id,
      "document_signature_history"
    );
    return this.signatureService.listDocumentSessions(id);
  }

  @RequireRoles("professional", "admin", "compliance")
  @Post("signature/sessions/:id/sync")
  async syncSession(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string
  ) {
    const session = await this.signatureService.getSessionScope(id);
    await this.resourceAccessService.assertDocumentAccess(
      principal,
      session.documentId,
      "signature_session_sync"
    );
    return this.signatureService.syncSessionStatus({ sessionId: id });
  }

  @RequireRoles("admin", "compliance")
  @Get("signature/provider/readiness")
  getProviderReadiness(@Query("provider") provider?: string) {
    return this.signatureProviderGateway.getReadiness({
      provider:
        provider === "GOVBR_VENDOR"
          ? SignatureProvider.GOVBR_VENDOR
          : SignatureProvider.ICP_BRASIL_VENDOR
    });
  }

  @RequireRoles("admin", "compliance")
  @Get("signature/operations")
  getOperations(@Query("provider") provider?: string) {
    return this.signatureService.getOperationsSnapshot({
      provider:
        provider === "GOVBR_VENDOR"
          ? SignatureProvider.GOVBR_VENDOR
          : SignatureProvider.ICP_BRASIL_VENDOR
    });
  }

  @RequireRoles("admin", "compliance")
  @Post("signature/sessions/sync-pending")
  syncPendingSessions(@Body() input: { limit?: number }) {
    return this.signatureService.syncPendingSessions({
      limit: input.limit
    });
  }
}
