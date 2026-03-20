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
  list() {
    return this.templatesService.list();
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
  create(@Body() input: Record<string, unknown>) {
    return this.templatesService.create({
      name: String(input.name),
      type: input.type as
        | "prescription"
        | "exam-request"
        | "medical-certificate"
        | "free-document",
      structure: (input.structure as Record<string, unknown> | undefined) ?? {}
    });
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
