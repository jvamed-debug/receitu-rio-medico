import test from "node:test";
import assert from "node:assert/strict";

import { ReminderProviderGateway } from "./reminder-provider.gateway";

test("gateway mock de lembretes gera referencia externa", async () => {
  const gateway = new ReminderProviderGateway({
    get: (key: string) => {
      if (key === "REMINDER_PROVIDER_MODE") {
        return "mock";
      }

      return undefined;
    }
  } as never);

  const result = await gateway.dispatch({
    reminderId: "rem-1",
    appointmentId: "apt-1",
    channel: "whatsapp",
    target: "+5511999999999",
    message: "Lembrete",
    scheduledFor: "2026-03-24T10:00:00.000Z"
  });

  assert.equal(result.providerReference, "reminder-whatsapp-rem-1");
  assert.equal(result.providerMetadata.providerMode, "mock");
});

test("gateway readiness remoto de lembretes reporta configuracao e health", async () => {
  const originalFetch = global.fetch;

  global.fetch = (async () => {
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: "healthy"
      })
    } as Response;
  }) as typeof fetch;

  try {
    const gateway = new ReminderProviderGateway({
      get: (key: string) => {
        switch (key) {
          case "REMINDER_PROVIDER_MODE":
            return "remote";
          case "REMINDER_PROVIDER_BASE_URL":
            return "https://messaging.vendor.example";
          case "REMINDER_PROVIDER_API_KEY":
            return "secret";
          default:
            return undefined;
        }
      }
    } as never);

    const result = await gateway.getReadiness();

    assert.equal(result.configured, true);
    assert.equal(result.connectivity.status, "ok");
    assert.equal(result.capabilities.dispatch, true);
  } finally {
    global.fetch = originalFetch;
  }
});
