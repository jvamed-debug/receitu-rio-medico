import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";

@UseGuards(AuthGuard, RolesGuard)
@Controller("branding")
export class BrandingController {
  private settings = {
    primaryColor: "#0a7f5a",
    accentColor: "#d9a441",
    logoUrl: null
  };

  @Get()
  getSettings() {
    return this.settings;
  }

  @RequireRoles("professional", "admin")
  @Patch()
  update(@Body() input: Record<string, unknown>) {
    this.settings = {
      ...this.settings,
      ...input
    };
    return this.settings;
  }
}
