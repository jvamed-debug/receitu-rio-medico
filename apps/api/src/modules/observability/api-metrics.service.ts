import { Injectable } from "@nestjs/common";

type RouteMetric = {
  key: string;
  method: string;
  route: string;
  count: number;
  errorCount: number;
  totalDurationMs: number;
  maxDurationMs: number;
  lastStatusCode?: number;
  lastRequestAt?: string;
};

@Injectable()
export class ApiMetricsService {
  private startedAt = new Date().toISOString();
  private totalRequests = 0;
  private totalErrors = 0;
  private readonly routes = new Map<string, RouteMetric>();

  record(input: {
    method: string;
    route: string;
    durationMs: number;
    statusCode: number;
  }) {
    this.totalRequests += 1;

    if (input.statusCode >= 500) {
      this.totalErrors += 1;
    }

    const key = `${input.method}:${input.route}`;
    const current = this.routes.get(key) ?? {
      key,
      method: input.method,
      route: input.route,
      count: 0,
      errorCount: 0,
      totalDurationMs: 0,
      maxDurationMs: 0
    };

    current.count += 1;
    current.totalDurationMs += input.durationMs;
    current.maxDurationMs = Math.max(current.maxDurationMs, input.durationMs);
    current.lastStatusCode = input.statusCode;
    current.lastRequestAt = new Date().toISOString();

    if (input.statusCode >= 500) {
      current.errorCount += 1;
    }

    this.routes.set(key, current);
  }

  snapshot() {
    const routes = [...this.routes.values()]
      .sort((left, right) => right.count - left.count)
      .map((item) => ({
        ...item,
        averageDurationMs:
          item.count > 0 ? Number((item.totalDurationMs / item.count).toFixed(2)) : 0
      }));

    return {
      startedAt: this.startedAt,
      totalRequests: this.totalRequests,
      totalErrors: this.totalErrors,
      errorRatePercent:
        this.totalRequests > 0
          ? Number(((this.totalErrors / this.totalRequests) * 100).toFixed(2))
          : 0,
      routes,
      slowestRoutes: [...routes]
        .sort((left, right) => right.maxDurationMs - left.maxDurationMs)
        .slice(0, 10),
      unstableRoutes: routes
        .filter((route) => route.errorCount > 0)
        .sort((left, right) => right.errorCount - left.errorCount)
        .slice(0, 10)
    };
  }

  exportCsv() {
    const snapshot = this.snapshot();
    const lines = [
      "method,route,count,errorCount,averageDurationMs,maxDurationMs,lastStatusCode,lastRequestAt"
    ];

    for (const route of snapshot.routes) {
      lines.push(
        [
          route.method,
          escapeCsv(route.route),
          route.count,
          route.errorCount,
          route.averageDurationMs,
          route.maxDurationMs,
          route.lastStatusCode ?? "",
          route.lastRequestAt ?? ""
        ].join(",")
      );
    }

    return lines.join("\n");
  }

  alerts(input?: {
    slowRouteThresholdMs?: number;
    errorRouteThreshold?: number;
  }) {
    const snapshot = this.snapshot();
    const slowRouteThresholdMs = input?.slowRouteThresholdMs ?? 1200;
    const errorRouteThreshold = input?.errorRouteThreshold ?? 1;
    const alerts: Array<{
      severity: "info" | "warning" | "critical";
      code: string;
      message: string;
    }> = [];

    if (snapshot.totalErrors > 0) {
      alerts.push({
        severity: snapshot.totalErrors >= 5 ? "critical" : "warning",
        code: "api_errors_present",
        message: `${snapshot.totalErrors} erro(s) 5xx registrados desde ${snapshot.startedAt}.`
      });
    }

    for (const route of snapshot.slowestRoutes.filter(
      (route) => route.maxDurationMs >= slowRouteThresholdMs
    )) {
      alerts.push({
        severity: route.maxDurationMs >= slowRouteThresholdMs * 2 ? "critical" : "warning",
        code: "slow_route_detected",
        message: `${route.method} ${route.route} atingiu ${route.maxDurationMs}ms.`
      });
    }

    for (const route of snapshot.unstableRoutes.filter(
      (route) => route.errorCount >= errorRouteThreshold
    )) {
      alerts.push({
        severity: route.errorCount >= 3 ? "critical" : "warning",
        code: "unstable_route_detected",
        message: `${route.method} ${route.route} acumulou ${route.errorCount} erro(s).`
      });
    }

    if (alerts.length === 0) {
      alerts.push({
        severity: "info",
        code: "api_healthy_baseline",
        message: "Nenhum alerta operacional relevante detectado nas metricas da API."
      });
    }

    return alerts;
  }
}

function escapeCsv(value: string) {
  if (value.includes(",") || value.includes("\"")) {
    return `"${value.replaceAll("\"", "\"\"")}"`;
  }

  return value;
}
