import test from "node:test";
import assert from "node:assert/strict";

import { SignatureProvider } from "@prisma/client";

import { SignatureProviderGateway } from "./signature-provider.gateway";

test("gateway mock gera referencia externa para ICP-Brasil", async () => {
  const gateway = new SignatureProviderGateway({
    get: (key: string) => {
      if (key === "SIGNATURE_PROVIDER_MODE") {
        return "mock";
      }

      return undefined;
    }
  } as never);

  const result = await gateway.sign({
    sessionId: "sig-1",
    documentId: "doc-1",
    professionalId: "prof-1",
    provider: SignatureProvider.ICP_BRASIL_VENDOR,
    signatureLevel: "qualified",
    policyVersion: "2026.03"
  });

  assert.equal(result.externalReference, "icpbr-sig-1");
  assert.equal(result.evidence.providerMode, "mock");
});
