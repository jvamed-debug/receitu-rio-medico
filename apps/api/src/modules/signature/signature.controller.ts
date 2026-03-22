import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards
} from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import type { AccessPrincipal } from "../auth/auth.types";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ensureRecentStepUp } from "../auth/step-up.util";
import { SignatureService } from "./signature.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller()
export class SignatureController {
  constructor(private readonly signatureService: SignatureService) {}

  @RequireRoles("professional", "admin")
  @Post("signature/sessions")
  createSession(
    @CurrentPrincipal() principal: { professionalId?: string },
    @Body() input: { documentId: string; provider: string }
  ) {
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
  signDocument(
    @CurrentPrincipal() principal: AccessPrincipal,
    @Param("id") id: string,
    @Body() input: { provider?: string }
  ) {
    ensureRecentStepUp(principal, "sign_document");
    return this.signatureService.signDocument({
      professionalId: principal.professionalId ?? "",
      documentId: id,
      provider: input.provider
    });
  }

  @Get("documents/:id/signatures")
  listDocumentSessions(@Param("id") id: string) {
    return this.signatureService.listDocumentSessions(id);
  }
}
