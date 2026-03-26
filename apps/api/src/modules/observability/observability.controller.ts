import { Controller, Get, Query, UseGuards } from "@nestjs/common";

import { AuditService } from "../audit/audit.service";
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
    private readonly requestContextService: RequestContextService,
    private readonly auditService: AuditService
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

  @RequireRoles("admin", "compliance")
  @Get("alerts")
  getAlerts(
    @Query("slowRouteThresholdMs") slowRouteThresholdMs?: string,
    @Query("errorRouteThreshold") errorRouteThreshold?: string
  ) {
    return this.apiMetricsService.alerts({
      slowRouteThresholdMs: slowRouteThresholdMs ? Number(slowRouteThresholdMs) : undefined,
      errorRouteThreshold: errorRouteThreshold ? Number(errorRouteThreshold) : undefined
    });
  }

  @RequireRoles("admin", "compliance")
  @Get("metrics/export")
  exportMetrics(@Query("format") format?: "json" | "csv") {
    if (format === "csv") {
      return {
        format: "csv",
        content: this.apiMetricsService.exportCsv()
      };
    }

    return {
      format: "json",
      content: this.apiMetricsService.snapshot()
    };
  }

  @RequireRoles("admin", "compliance")
  @Get("audit/export")
  async exportAudit(@Query("limit") limit?: string) {
    const normalizedLimit = Math.min(Math.max(Number(limit ?? 100), 1), 500);

    return {
      format: "json",
      limit: normalizedLimit,
      content: await this.auditService.listRecent(normalizedLimit)
    };
  }
}
