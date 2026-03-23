import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

import { PaymentProviderGateway } from "./payment-provider.gateway";

test("gateway mock de pagamento gera autorizacao", async () => {
  const gateway = new PaymentProviderGateway({
    get: (key: string) => {
      if (key === "PAYMENT_PROVIDER_MODE") {
        return "mock";
      }

      return undefined;
    }
  } as never);

  const result = await gateway.authorize({
    billingId: "bill-1",
    appointmentId: "apt-1",
    amountCents: 25000,
    currency: "BRL",
    description: "Consulta",
    paymentProvider: "manual"
  });

  assert.equal(result.externalReference, "manual-bill-1");
  assert.equal(result.providerMetadata.providerMode, "mock");
});

test("gateway mock de pagamento gera checkout", async () => {
  const gateway = new PaymentProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "PAYMENT_PROVIDER_MODE":
          return "mock";
        case "PAYMENT_PROVIDER_CHECKOUT_BASE_URL":
          return "https://payments.receituario.local";
        default:
          return undefined;
      }
    }
  } as never);

  const result = await gateway.createCheckout({
    billingId: "bill-1",
    appointmentId: "apt-1",
    amountCents: 25000,
    currency: "BRL",
    description: "Consulta",
    paymentProvider: "manual"
  });

  assert.equal(
    result.checkoutUrl,
    "https://payments.receituario.local/checkout/manual-bill-1"
  );
});

test("gateway readiness remoto de pagamento reporta configuracao e health", async () => {
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
    const gateway = new PaymentProviderGateway({
      get: (key: string) => {
        switch (key) {
          case "PAYMENT_PROVIDER_MODE":
            return "remote";
          case "PAYMENT_PROVIDER_BASE_URL":
            return "https://payments.vendor.example";
          case "PAYMENT_PROVIDER_API_KEY":
            return "secret";
          case "PAYMENT_PROVIDER_WEBHOOK_HMAC_SECRET":
            return "webhook-hmac";
          default:
            return undefined;
        }
      }
    } as never);

    const result = await gateway.getReadiness();

    assert.equal(result.configured, true);
    assert.equal(result.connectivity.status, "ok");
    assert.equal(result.webhookVerificationMode, "hmac");
  } finally {
    global.fetch = originalFetch;
  }
});

test("gateway verifyWebhook aceita hmac valido", async () => {
  const gateway = new PaymentProviderGateway({
    get: (key: string) => {
      switch (key) {
        case "PAYMENT_PROVIDER_WEBHOOK_HMAC_SECRET":
          return "webhook-hmac";
        case "PAYMENT_PROVIDER_WEBHOOK_MAX_AGE_SECONDS":
          return "300";
        default:
          return undefined;
      }
    }
  } as never);

  const payload = {
    appointmentId: "apt-1",
    billingId: "bill-1",
    status: "paid"
  };
  const timestamp = String(Date.now());
  const content =
    `${timestamp}.{"appointmentId":"apt-1","billingId":"bill-1","status":"paid"}`;
  const signature = createHmac("sha256", "webhook-hmac")
    .update(content)
    .digest("hex");

  assert.equal(
    gateway.verifyWebhook({
      timestamp,
      signature,
      payload
    }),
    true
  );
});
