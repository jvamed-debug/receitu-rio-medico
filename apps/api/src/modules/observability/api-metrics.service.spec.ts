import test from "node:test";
import assert from "node:assert/strict";

import { ApiMetricsService } from "./api-metrics.service";

test("agrega metricas por rota e conta erros 5xx", () => {
  const service = new ApiMetricsService();

  service.record({
    method: "GET",
    route: "/api/health",
    durationMs: 20,
    statusCode: 200
  });
  service.record({
    method: "GET",
    route: "/api/health",
    durationMs: 40,
    statusCode: 503
  });

  const snapshot = service.snapshot();
  const route = snapshot.routes.find((item) => item.key === "GET:/api/health");

  assert.equal(snapshot.totalRequests, 2);
  assert.equal(snapshot.totalErrors, 1);
  assert.equal(route?.count, 2);
  assert.equal(route?.errorCount, 1);
  assert.equal(route?.averageDurationMs, 30);
});

test("gera alertas e exporta csv operacional", () => {
  const service = new ApiMetricsService();

  service.record({
    method: "GET",
    route: "/api/slow",
    durationMs: 2500,
    statusCode: 500
  });

  const alerts = service.alerts({
    slowRouteThresholdMs: 1000,
    errorRouteThreshold: 1
  });
  const csv = service.exportCsv();

  assert.equal(alerts.length >= 2, true);
  assert.match(csv, /method,route,count,errorCount/);
  assert.match(csv, /GET,\/api\/slow,1,1/);
});
