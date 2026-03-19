import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { PersistenceModule } from "../../persistence/persistence.module";
import { AuthController } from "./auth.controller";
import { AuthGuard } from "./auth.guard";
import { RolesGuard } from "./roles.guard";
import { AuthService } from "./auth.service";

@Module({
  imports: [PersistenceModule],
  controllers: [AuthController],
  providers: [AuthService, AuthGuard, RolesGuard, Reflector],
  exports: [AuthService, AuthGuard, RolesGuard]
})
export class AuthModule {}
