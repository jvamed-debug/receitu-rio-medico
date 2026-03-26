import { Module } from "@nestjs/common";

import { AuditModule } from "../audit/audit.module";
import { AuthModule } from "../auth/auth.module";
import { ApiMetricsService } from "./api-metrics.service";
import { ObservabilityController } from "./observability.controller";
import { RequestContextMiddleware } from "./request-context.middleware";
import { RequestContextService } from "./request-context.service";

@Module({
  imports: [AuthModule, AuditModule],
  controllers: [ObservabilityController],
  providers: [
    ApiMetricsService,
    RequestContextService,
    RequestContextMiddleware
  ],
  exports: [ApiMetricsService, RequestContextService, RequestContextMiddleware]
})
export class ObservabilityModule {}
