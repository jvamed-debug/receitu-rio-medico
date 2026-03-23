import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  PaymentAuthorizationInput,
  PaymentAuthorizationResult,
  PaymentCheckoutInput,
  PaymentCheckoutResult,
  PaymentCaptureInput,
  PaymentCaptureResult,
  PaymentProviderReadinessResult
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

  async createCheckout(
    input: PaymentCheckoutInput
  ): Promise<PaymentCheckoutResult> {
    if (this.getProviderMode() === "mock") {
      const externalReference =
        input.existingExternalReference ??
        `${input.paymentProvider.toLowerCase()}-${input.billingId}`;
      const checkoutBaseUrl =
        this.configService.get<string>("PAYMENT_PROVIDER_CHECKOUT_BASE_URL") ??
        "https://payments.receituario.local";

      return {
        externalReference,
        checkoutUrl: `${checkoutBaseUrl.replace(/\/$/, "")}/checkout/${externalReference}`,
        providerMetadata: {
          providerMode: "mock",
          stage: "checkout"
        }
      };
    }

    return this.executeRemoteCheckout(input);
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

  async getReadiness(): Promise<PaymentProviderReadinessResult> {
    const mode = this.getProviderMode();
    const checkedAt = new Date().toISOString();
    const baseUrl = this.configService.get<string>("PAYMENT_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("PAYMENT_PROVIDER_API_KEY");
    const webhookSecret = this.configService.get<string>("PAYMENT_PROVIDER_WEBHOOK_SECRET");
    const webhookHmacSecret = this.configService.get<string>("PAYMENT_PROVIDER_WEBHOOK_HMAC_SECRET");
    const issues: string[] = [];

    if (mode === "mock") {
      return {
        mode,
        checkedAt,
        configured: true,
        webhookVerificationMode: webhookHmacSecret ? "hmac" : "shared-secret",
        capabilities: {
          authorize: true,
          capture: true,
          checkout: true,
          webhookSupport: true,
          hmacVerification: Boolean(webhookHmacSecret)
        },
        connectivity: {
          status: "mock"
        },
        issues,
        metadata: {
          providerMode: "mock"
        }
      };
    }

    if (!baseUrl || !apiKey) {
      issues.push("PAYMENT_PROVIDER_BASE_URL ou PAYMENT_PROVIDER_API_KEY ausentes");
    }

    if (!webhookSecret && !webhookHmacSecret) {
      issues.push("Nenhum mecanismo de verificacao de webhook configurado");
    }

    if (issues.length > 0) {
      return {
        mode,
        checkedAt,
        configured: false,
        webhookVerificationMode: webhookHmacSecret ? "hmac" : "shared-secret",
        capabilities: {
          authorize: false,
          capture: false,
          checkout: false,
          webhookSupport: true,
          hmacVerification: Boolean(webhookHmacSecret)
        },
        connectivity: {
          status: "unavailable"
        },
        issues,
        metadata: {
          providerMode: "remote"
        }
      };
    }

    const healthResult = await this.checkRemoteHealth(baseUrl!, apiKey!);

    if (healthResult.status !== "ok") {
      issues.push(
        healthResult.status === "degraded"
          ? "Provider de pagamento retornou estado degradado"
          : "Provider de pagamento indisponivel"
      );
    }

    return {
      mode,
      checkedAt,
      configured: true,
      webhookVerificationMode: webhookHmacSecret ? "hmac" : "shared-secret",
      capabilities: {
        authorize: true,
        capture: true,
        checkout: true,
        webhookSupport: true,
        hmacVerification: Boolean(webhookHmacSecret)
      },
      connectivity: {
        status: healthResult.status,
        httpStatus: healthResult.httpStatus
      },
      issues,
      metadata: {
        providerMode: "remote",
        providerHealth: healthResult.providerHealth ?? null
      }
    };
  }

  verifyWebhook(input: {
    secret?: string;
    timestamp?: string;
    signature?: string;
    payload: Record<string, unknown>;
  }) {
    const webhookSecret =
      this.configService.get<string>("PAYMENT_PROVIDER_WEBHOOK_SECRET") ??
      "receituario-webhook-secret";
    const webhookHmacSecret = this.configService.get<string>("PAYMENT_PROVIDER_WEBHOOK_HMAC_SECRET");
    const maxAgeSeconds = Number(
      this.configService.get<string>("PAYMENT_PROVIDER_WEBHOOK_MAX_AGE_SECONDS") ?? "300"
    );

    if (webhookHmacSecret) {
      if (!input.timestamp || !input.signature) {
        return false;
      }

      const timestampMs = Number(input.timestamp);
      if (!Number.isFinite(timestampMs)) {
        return false;
      }

      if (Math.abs(Date.now() - timestampMs) > maxAgeSeconds * 1000) {
        return false;
      }

      const content = `${input.timestamp}.${stableStringify(input.payload)}`;
      const expectedSignature = createHmac("sha256", webhookHmacSecret)
        .update(content)
        .digest("hex");

      return safeCompare(expectedSignature, input.signature);
    }

    return Boolean(input.secret && input.secret === webhookSecret);
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

  private async executeRemoteCheckout(
    input: PaymentCheckoutInput
  ): Promise<PaymentCheckoutResult> {
    const payload = await this.executeRemoteCall("/payments/checkout", input);

    if (!payload.externalReference || !payload.checkoutUrl) {
      throw new ServiceUnavailableException(
        "Provider de pagamento retornou checkout incompleto"
      );
    }

    return {
      externalReference: payload.externalReference,
      checkoutUrl: payload.checkoutUrl,
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
        checkoutUrl?: string;
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
    return (this.configService.get<string>("PAYMENT_PROVIDER_MODE") ?? "mock").toLowerCase() as
      | "mock"
      | "remote";
  }

  private async checkRemoteHealth(baseUrl: string, apiKey: string) {
    const timeoutMs = Number(
      this.configService.get<string>("PAYMENT_PROVIDER_TIMEOUT_MS") ?? "10000"
    );
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/health`, {
        method: "GET",
        headers: {
          authorization: `Bearer ${apiKey}`
        },
        signal: controller.signal
      });

      if (!response.ok) {
        return {
          status: response.status >= 500 ? "unavailable" : "degraded",
          httpStatus: response.status
        } as const;
      }

      const payload = (await response.json()) as {
        status?: string;
        health?: string;
      };
      const providerHealth = (payload.health ?? payload.status ?? "ok").toLowerCase();

      return {
        status: ["ok", "healthy", "ready"].includes(providerHealth) ? "ok" : "degraded",
        httpStatus: response.status,
        providerHealth
      } as const;
    } catch {
      return {
        status: "unavailable"
      } as const;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return `{${entries
    .map(([key, nestedValue]) => `${JSON.stringify(key)}:${stableStringify(nestedValue)}`)
    .join(",")}}`;
}

function safeCompare(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
