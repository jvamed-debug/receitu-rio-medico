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
