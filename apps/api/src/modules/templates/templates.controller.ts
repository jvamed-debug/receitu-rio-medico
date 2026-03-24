import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { CurrentPrincipal } from "../auth/current-principal.decorator";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { TemplatesService } from "./templates.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller("templates")
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Get()
  list(
    @CurrentPrincipal()
    principal: {
      userId: string;
      organizationId?: string;
      roles: string[];
    }
  ) {
    return this.templatesService.list(principal);
  }

  @Get("favorites")
  listFavorites(
    @CurrentPrincipal()
    principal: {
      userId: string;
    }
  ) {
    return this.templatesService.listFavorites(principal.userId);
  }

  @RequireRoles("professional", "admin")
  @Post()
  create(
    @CurrentPrincipal()
    principal: {
      userId: string;
      organizationId?: string;
      roles: string[];
    },
    @Body() input: Record<string, unknown>
  ) {
    return this.templatesService.create(principal, {
      name: String(input.name),
      type: input.type as
        | "prescription"
        | "exam-request"
        | "medical-certificate"
        | "free-document",
      scope:
        input.scope === "institutional" || input.scope === "personal"
          ? input.scope
          : undefined,
      structure: (input.structure as Record<string, unknown> | undefined) ?? {}
    });
  }

  @RequireRoles("professional", "admin")
  @Post(":id/publish")
  publish(
    @CurrentPrincipal()
    principal: {
      userId: string;
      organizationId?: string;
      roles: string[];
    },
    @Param("id") id: string
  ) {
    return this.templatesService.publish(principal, id);
  }

  @RequireRoles("professional", "admin")
  @Post(":id/archive")
  archive(
    @CurrentPrincipal()
    principal: {
      userId: string;
      organizationId?: string;
      roles: string[];
    },
    @Param("id") id: string
  ) {
    return this.templatesService.archive(principal, id);
  }

  @RequireRoles("professional", "admin")
  @Post("favorites")
  saveFavorite(
    @CurrentPrincipal()
    principal: {
      userId: string;
    },
    @Body() input: Record<string, unknown>
  ) {
    return this.templatesService.saveFavorite(principal.userId, {
      presetKey: String(input.presetKey),
      label: typeof input.label === "string" ? input.label : undefined,
      category: typeof input.category === "string" ? input.category : undefined,
      templateId: typeof input.templateId === "string" ? input.templateId : undefined
    });
  }

  @RequireRoles("professional", "admin")
  @Delete("favorites/:presetKey")
  removeFavorite(
    @CurrentPrincipal()
    principal: {
      userId: string;
    },
    @Param("presetKey") presetKey: string
  ) {
    return this.templatesService.removeFavorite(principal.userId, presetKey);
  }
}
