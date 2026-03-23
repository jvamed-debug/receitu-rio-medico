import test from "node:test";
import assert from "node:assert/strict";

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
