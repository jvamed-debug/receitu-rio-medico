import { Controller, Get, UseGuards } from "@nestjs/common";

import { AuthGuard } from "../auth/auth.guard";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ApiMetricsService } from "./api-metrics.service";
import { RequestContextService } from "./request-context.service";

@UseGuards(AuthGuard, RolesGuard)
@Controller("ops")
export class ObservabilityController {
  constructor(
    private readonly apiMetricsService: ApiMetricsService,
    private readonly requestContextService: RequestContextService
  ) {}

  @RequireRoles("admin", "compliance")
  @Get("metrics")
  getMetrics() {
    return this.apiMetricsService.snapshot();
  }

  @RequireRoles("admin", "compliance")
  @Get("context")
  getContext() {
    return {
      requestId: this.requestContextService.getRequestId() ?? null,
      correlationId: this.requestContextService.getCorrelationId() ?? null
    };
  }
}
