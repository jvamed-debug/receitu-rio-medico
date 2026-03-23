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

test("gateway remoto inclui callback na requisicao", async () => {
  let receivedBody: Record<string, unknown> | undefined;
  const originalFetch = global.fetch;

  global.fetch = (async (_input, init) => {
    receivedBody = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    return {
      ok: true,
      json: async () => ({
        externalReference: "remote-sig-1",
        signedAt: "2026-03-23T10:00:00.000Z",
        evidence: { providerMode: "remote" }
      })
    } as Response;
  }) as typeof fetch;

  try {
    const gateway = new SignatureProviderGateway({
      get: (key: string) => {
        switch (key) {
          case "SIGNATURE_PROVIDER_MODE":
            return "remote";
          case "SIGNATURE_PROVIDER_BASE_URL":
            return "https://signature.vendor.example";
          case "SIGNATURE_PROVIDER_API_KEY":
            return "secret";
          case "API_PUBLIC_URL":
            return "https://api.receituario.app";
          case "SIGNATURE_PROVIDER_CALLBACK_SECRET":
            return "callback-secret";
          default:
            return undefined;
        }
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

    assert.equal(result.externalReference, "remote-sig-1");
    assert.equal(
      receivedBody?.callbackUrl,
      "https://api.receituario.app/api/signature/providers/callback"
    );
    assert.equal(receivedBody?.callbackSecret, "callback-secret");
  } finally {
    global.fetch = originalFetch;
  }
});
