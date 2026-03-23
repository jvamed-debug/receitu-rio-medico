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
