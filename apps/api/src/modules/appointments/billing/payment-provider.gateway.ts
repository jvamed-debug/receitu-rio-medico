import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  PaymentAuthorizationInput,
  PaymentAuthorizationResult,
  PaymentCaptureInput,
  PaymentCaptureResult
} from "./payment-provider.port";

@Injectable()
export class PaymentProviderGateway {
  constructor(private readonly configService: ConfigService) {}

  async authorize(
    input: PaymentAuthorizationInput
  ): Promise<PaymentAuthorizationResult> {
    if (this.getProviderMode() === "mock") {
      const authorizedAt = new Date().toISOString();
      return {
        externalReference:
          input.existingExternalReference ??
          `${input.paymentProvider.toLowerCase()}-${input.billingId}`,
        authorizedAt,
        providerMetadata: {
          providerMode: "mock",
          stage: "authorize",
          authorizedAt
        }
      };
    }

    return this.executeRemoteAuthorization(input);
  }

  async capture(input: PaymentCaptureInput): Promise<PaymentCaptureResult> {
    if (this.getProviderMode() === "mock") {
      const paidAt = new Date().toISOString();
      return {
        externalReference:
          input.externalReference ?? `${input.paymentProvider.toLowerCase()}-${input.billingId}`,
        paidAt,
        providerMetadata: {
          providerMode: "mock",
          stage: "capture",
          paidAt
        }
      };
    }

    return this.executeRemoteCapture(input);
  }

  private async executeRemoteAuthorization(
    input: PaymentAuthorizationInput
  ): Promise<PaymentAuthorizationResult> {
    const payload = await this.executeRemoteCall("/payments/authorize", input);

    if (!payload.externalReference || !payload.authorizedAt) {
      throw new ServiceUnavailableException(
        "Provider de pagamento retornou autorizacao incompleta"
      );
    }

    return {
      externalReference: payload.externalReference,
      authorizedAt: payload.authorizedAt,
      providerMetadata: payload.providerMetadata ?? {}
    };
  }

  private async executeRemoteCapture(
    input: PaymentCaptureInput
  ): Promise<PaymentCaptureResult> {
    const payload = await this.executeRemoteCall("/payments/capture", input);

    if (!payload.externalReference || !payload.paidAt) {
      throw new ServiceUnavailableException(
        "Provider de pagamento retornou captura incompleta"
      );
    }

    return {
      externalReference: payload.externalReference,
      paidAt: payload.paidAt,
      providerMetadata: payload.providerMetadata ?? {}
    };
  }

  private async executeRemoteCall(path: string, body: unknown) {
    const baseUrl = this.configService.get<string>("PAYMENT_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("PAYMENT_PROVIDER_API_KEY");
    const timeoutMs = Number(
      this.configService.get<string>("PAYMENT_PROVIDER_TIMEOUT_MS") ?? "10000"
    );

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider de pagamento configurado sem base URL ou API key"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Provider de pagamento respondeu com status ${response.status}`
        );
      }

      return (await response.json()) as {
        externalReference?: string;
        authorizedAt?: string;
        paidAt?: string;
        providerMetadata?: Record<string, unknown>;
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Falha ao comunicar com provider de pagamento: ${error.message}`
          : "Falha ao comunicar com provider de pagamento"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getProviderMode() {
    return (this.configService.get<string>("PAYMENT_PROVIDER_MODE") ?? "mock").toLowerCase();
  }
}
