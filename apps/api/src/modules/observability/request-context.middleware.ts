import { Injectable, NestMiddleware } from "@nestjs/common";
import { randomUUID } from "node:crypto";

import { ApiMetricsService } from "./api-metrics.service";
import { RequestContextService } from "./request-context.service";

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(
    private readonly requestContextService: RequestContextService,
    private readonly apiMetricsService: ApiMetricsService
  ) {}

  use(
    req: {
      method: string;
      originalUrl?: string;
      url?: string;
      headers: Record<string, string | string[] | undefined>;
    },
    res: {
      statusCode: number;
      setHeader(name: string, value: string): void;
      on(event: "finish", listener: () => void): void;
    },
    next: () => void
  ) {
    const requestId = this.getFirstHeader(req.headers["x-request-id"]) ?? randomUUID();
    const correlationId =
      this.getFirstHeader(req.headers["x-correlation-id"]) ?? requestId;
    const route = req.originalUrl ?? req.url ?? "/";
    const startedAt = Date.now();

    res.setHeader("x-request-id", requestId);
    res.setHeader("x-correlation-id", correlationId);

    this.requestContextService.run(
      {
        requestId,
        correlationId,
        method: req.method,
        path: route
      },
      () => {
        res.on("finish", () => {
          this.apiMetricsService.record({
            method: req.method,
            route,
            durationMs: Date.now() - startedAt,
            statusCode: res.statusCode
          });
        });

        next();
      }
    );
  }

  private getFirstHeader(value?: string | string[]) {
    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
