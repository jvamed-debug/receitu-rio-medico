import test from "node:test";
import assert from "node:assert/strict";

import { TelehealthProviderGateway } from "./telehealth-provider.gateway";

test("gateway mock de teleconsulta provisiona sala com join url", async () => {
  const gateway = new TelehealthProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "TELEHEALTH_PROVIDER_MODE":
          return "mock";
        case "TELEHEALTH_PROVIDER_NAME":
          return "bluecare-meet";
        case "TELEHEALTH_PROVIDER_JOIN_BASE_URL":
          return "https://telemed.receituario.local";
        default:
          return undefined;
      }
    }
  } as never);

  const result = await gateway.provisionRoom({
    appointmentId: "apt-1",
    professionalId: "prof-1",
    patientId: "patient-1",
    title: "Teleconsulta",
    appointmentAt: "2026-03-25T18:00:00.000Z",
    durationMinutes: 30
  });

  assert.equal(result.provider, "bluecare-meet");
  assert.equal(result.roomId, "tele-apt-1");
  assert.equal(
    result.joinUrl,
    "https://telemed.receituario.local/rooms/tele-apt-1"
  );
});
