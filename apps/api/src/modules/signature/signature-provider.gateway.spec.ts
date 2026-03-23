import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

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

test("gateway remoto normaliza status de assinatura", async () => {
  const originalFetch = global.fetch;

  global.fetch = (async () => {
    return {
      ok: true,
      json: async () => ({
        status: "completed",
        externalReference: "remote-sig-2",
        signedAt: "2026-03-23T10:05:00.000Z",
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
          default:
            return undefined;
        }
      }
    } as never);

    const result = await gateway.getStatus({
      sessionId: "sig-2",
      externalReference: "remote-sig-2",
      provider: SignatureProvider.ICP_BRASIL_VENDOR
    });

    assert.equal(result.status, "signed");
    assert.equal(result.externalReference, "remote-sig-2");
    assert.equal(result.providerStatus, "completed");
  } finally {
    global.fetch = originalFetch;
  }
});

test("gateway readiness remoto reporta configuracao e health", async () => {
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
    const gateway = new SignatureProviderGateway({
      get: (key: string) => {
        switch (key) {
          case "SIGNATURE_PROVIDER_MODE":
            return "remote";
          case "SIGNATURE_PROVIDER_BASE_URL":
            return "https://signature.vendor.example";
          case "SIGNATURE_PROVIDER_API_KEY":
            return "secret";
          case "SIGNATURE_PROVIDER_CALLBACK_HMAC_SECRET":
            return "hmac-secret";
          case "API_PUBLIC_URL":
            return "https://api.receituario.app";
          default:
            return undefined;
        }
      }
    } as never);

    const result = await gateway.getReadiness({
      provider: SignatureProvider.ICP_BRASIL_VENDOR
    });

    assert.equal(result.configured, true);
    assert.equal(result.connectivity.status, "ok");
    assert.equal(result.callbackVerificationMode, "hmac");
  } finally {
    global.fetch = originalFetch;
  }
});

test("gateway verifyCallback aceita hmac valido", async () => {
  const gateway = new SignatureProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "SIGNATURE_PROVIDER_CALLBACK_HMAC_SECRET":
          return "hmac-secret";
        case "SIGNATURE_PROVIDER_CALLBACK_MAX_AGE_SECONDS":
          return "300";
        default:
          return undefined;
      }
    }
  } as never);

  const payload = {
    sessionId: "sig-1",
    status: "signed",
    externalReference: "ref-1"
  };
  const timestamp = String(Date.now());
  const content =
    `${timestamp}.{"externalReference":"ref-1","sessionId":"sig-1","status":"signed"}`;
  const signature = createHmac("sha256", "hmac-secret")
    .update(content)
    .digest("hex");

  assert.equal(
    gateway.verifyCallback({
      timestamp,
      signature,
      payload
    }),
    true
  );
});
