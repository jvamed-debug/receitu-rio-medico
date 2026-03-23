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
      routes
    };
  }
}
