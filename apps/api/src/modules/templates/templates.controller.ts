import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
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
}
