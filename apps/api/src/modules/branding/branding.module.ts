import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { BrandingController } from "./branding.controller";

@Module({
  imports: [AuthModule],
  controllers: [BrandingController]
})
export class BrandingModule {}
