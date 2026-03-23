import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SignatureProvider } from "@prisma/client";
import { createHmac, timingSafeEqual } from "node:crypto";

import type {
  SignatureProviderExecutionInput,
  SignatureProviderExecutionResult,
  SignatureProviderReadinessResult,
  SignatureProviderStatusResult
} from "./signature-provider.port";

@Injectable()
export class SignatureProviderGateway {
  constructor(private readonly configService: ConfigService) {}

  async sign(
    input: SignatureProviderExecutionInput
  ): Promise<SignatureProviderExecutionResult> {
    switch (input.provider) {
      case SignatureProvider.ICP_BRASIL_VENDOR:
        return this.signWithIcpBrasilVendor(input);
      case SignatureProvider.GOVBR_VENDOR:
        return this.signWithGovBrVendor(input);
      default:
        throw new ServiceUnavailableException(
          "Provider de assinatura nao suportado"
        );
    }
  }

  async getStatus(input: {
    sessionId: string;
    provider: SignatureProvider;
    externalReference?: string | null;
  }): Promise<SignatureProviderStatusResult> {
    switch (input.provider) {
      case SignatureProvider.ICP_BRASIL_VENDOR:
        return this.getStatusForProvider(input, "icp-brasil-vendor");
      case SignatureProvider.GOVBR_VENDOR:
        return this.getStatusForProvider(input, "govbr-vendor");
      default:
        throw new ServiceUnavailableException(
          "Provider de assinatura nao suportado"
        );
    }
  }

  async getReadiness(input: {
    provider: SignatureProvider;
  }): Promise<SignatureProviderReadinessResult> {
    const mode = this.getProviderMode();
    const checkedAt = new Date().toISOString();
    const baseUrl = this.configService.get<string>("SIGNATURE_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("SIGNATURE_PROVIDER_API_KEY");
    const callbackSecret = this.configService.get<string>(
      "SIGNATURE_PROVIDER_CALLBACK_SECRET"
    );
    const callbackHmacSecret = this.configService.get<string>(
      "SIGNATURE_PROVIDER_CALLBACK_HMAC_SECRET"
    );
    const callbackBaseUrl = this.configService.get<string>("API_PUBLIC_URL");
    const issues: string[] = [];

    if (!callbackBaseUrl) {
      issues.push("API_PUBLIC_URL nao configurada para callback publico");
    }

    if (mode === "mock") {
      return {
        mode,
        provider: input.provider,
        checkedAt,
        configured: true,
        callbackVerificationMode: callbackHmacSecret ? "hmac" : "shared-secret",
        capabilities: {
          createSignature: true,
          statusLookup: true,
          callbackSupport: true,
          hmacVerification: Boolean(callbackHmacSecret)
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
      issues.push("SIGNATURE_PROVIDER_BASE_URL ou SIGNATURE_PROVIDER_API_KEY ausentes");
    }

    if (!callbackSecret && !callbackHmacSecret) {
      issues.push("Nenhum mecanismo de verificacao de callback configurado");
    }

    if (issues.length > 0) {
      return {
        mode,
        provider: input.provider,
        checkedAt,
        configured: false,
        callbackVerificationMode: callbackHmacSecret ? "hmac" : "shared-secret",
        capabilities: {
          createSignature: false,
          statusLookup: false,
          callbackSupport: Boolean(callbackBaseUrl),
          hmacVerification: Boolean(callbackHmacSecret)
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
          ? "Provider de assinatura retornou estado degradado"
          : "Provider de assinatura indisponivel para homologacao"
      );
    }

    return {
      mode,
      provider: input.provider,
      checkedAt,
      configured: true,
      callbackVerificationMode: callbackHmacSecret ? "hmac" : "shared-secret",
      capabilities: {
        createSignature: true,
        statusLookup: true,
        callbackSupport: true,
        hmacVerification: Boolean(callbackHmacSecret)
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

  verifyCallback(input: {
    secret?: string;
    timestamp?: string;
    signature?: string;
    payload: Record<string, unknown>;
  }) {
    const expectedSecret =
      this.configService.get<string>("SIGNATURE_PROVIDER_CALLBACK_SECRET") ??
      "receituario-signature-callback";
    const callbackHmacSecret = this.configService.get<string>(
      "SIGNATURE_PROVIDER_CALLBACK_HMAC_SECRET"
    );
    const maxAgeSeconds = Number(
      this.configService.get<string>("SIGNATURE_PROVIDER_CALLBACK_MAX_AGE_SECONDS") ??
        "300"
    );

    if (callbackHmacSecret) {
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
      const expectedSignature = createHmac("sha256", callbackHmacSecret)
        .update(content)
        .digest("hex");

      return safeCompare(expectedSignature, input.signature);
    }

    return Boolean(input.secret && input.secret === expectedSecret);
  }

  private async signWithIcpBrasilVendor(
    input: SignatureProviderExecutionInput
  ) {
    const mode = this.getProviderMode();

    if (mode === "mock") {
      return this.buildMockResult("icpbr", input);
    }

    return this.executeRemoteSignature(input, "icp-brasil-vendor");
  }

  private async signWithGovBrVendor(
    input: SignatureProviderExecutionInput
  ) {
    const mode = this.getProviderMode();

    if (mode === "mock") {
      return this.buildMockResult("govbr", input);
    }

    return this.executeRemoteSignature(input, "govbr-vendor");
  }

  private async getStatusForProvider(
    input: {
      sessionId: string;
      provider: SignatureProvider;
      externalReference?: string | null;
    },
    providerCode: string
  ): Promise<SignatureProviderStatusResult> {
    const mode = this.getProviderMode();

    if (mode === "mock") {
      return {
        status: "signed",
        externalReference:
          input.externalReference ?? `${providerCode}-${input.sessionId}`,
        signedAt: new Date().toISOString(),
        providerStatus: "mock_signed",
        evidence: {
          providerMode: "mock",
          providerCode,
          syncedAt: new Date().toISOString()
        }
      };
    }

    return this.executeRemoteStatusLookup(input, providerCode);
  }

  private buildMockResult(
    channel: "icpbr" | "govbr",
    input: SignatureProviderExecutionInput
  ): SignatureProviderExecutionResult {
    const signedAt = new Date().toISOString();

    return {
      externalReference: `${channel}-${input.sessionId}`,
      signedAt,
      evidence: {
        providerMode: "mock",
        providerChannel: channel,
        signedAt,
        sessionId: input.sessionId
      }
    };
  }

  private async executeRemoteSignature(
    input: SignatureProviderExecutionInput,
    providerCode: string
  ): Promise<SignatureProviderExecutionResult> {
    const baseUrl = this.configService.get<string>("SIGNATURE_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("SIGNATURE_PROVIDER_API_KEY");
    const timeoutMs = Number(
      this.configService.get<string>("SIGNATURE_PROVIDER_TIMEOUT_MS") ?? "10000"
    );
    const callbackSecret =
      this.configService.get<string>("SIGNATURE_PROVIDER_CALLBACK_SECRET") ??
      "receituario-signature-callback";
    const callbackBaseUrl = this.configService.get<string>("API_PUBLIC_URL");

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider de assinatura configurado sem base URL ou API key"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/signatures`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "x-signature-provider": providerCode
        },
        body: JSON.stringify({
          sessionId: input.sessionId,
          documentId: input.documentId,
          professionalId: input.professionalId,
          provider: input.provider,
          signatureLevel: input.signatureLevel,
          policyVersion: input.policyVersion,
          expiresAt: input.expiresAt,
          requestContext: input.requestContext,
          callbackUrl:
            input.callbackUrl ??
            (callbackBaseUrl
              ? `${callbackBaseUrl.replace(/\/$/, "")}/api/signature/providers/callback`
              : undefined),
          callbackSecret: input.callbackSecret ?? callbackSecret
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Provider de assinatura respondeu com status ${response.status}`
        );
      }

      const payload = (await response.json()) as {
        externalReference?: string;
        signedAt?: string;
        evidence?: Record<string, unknown>;
      };

      if (!payload.externalReference || !payload.signedAt) {
        throw new ServiceUnavailableException(
          "Provider de assinatura retornou payload incompleto"
        );
      }

      return {
        externalReference: payload.externalReference,
        signedAt: payload.signedAt,
        evidence: payload.evidence ?? {}
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Falha ao comunicar com provider de assinatura: ${error.message}`
          : "Falha ao comunicar com provider de assinatura"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private async executeRemoteStatusLookup(
    input: {
      sessionId: string;
      provider: SignatureProvider;
      externalReference?: string | null;
    },
    providerCode: string
  ): Promise<SignatureProviderStatusResult> {
    const baseUrl = this.configService.get<string>("SIGNATURE_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("SIGNATURE_PROVIDER_API_KEY");
    const timeoutMs = Number(
      this.configService.get<string>("SIGNATURE_PROVIDER_TIMEOUT_MS") ?? "10000"
    );

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider de assinatura configurado sem base URL ou API key"
      );
    }

    const lookupRef = input.externalReference ?? input.sessionId;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/$/, "")}/signatures/${encodeURIComponent(lookupRef)}`,
        {
          method: "GET",
          headers: {
            authorization: `Bearer ${apiKey}`,
            "x-signature-provider": providerCode
          },
          signal: controller.signal
        }
      );

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Provider de assinatura respondeu com status ${response.status} ao consultar sessao`
        );
      }

      const payload = (await response.json()) as {
        status?: string;
        externalReference?: string;
        signedAt?: string;
        evidence?: Record<string, unknown>;
      };

      return normalizeRemoteProviderStatus(payload, lookupRef);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Falha ao sincronizar provider de assinatura: ${error.message}`
          : "Falha ao sincronizar provider de assinatura"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getProviderMode() {
    return (
      this.configService.get<string>("SIGNATURE_PROVIDER_MODE") ?? "mock"
    ).toLowerCase() as "mock" | "remote";
  }

  private async checkRemoteHealth(baseUrl: string, apiKey: string) {
    const timeoutMs = Number(
      this.configService.get<string>("SIGNATURE_PROVIDER_TIMEOUT_MS") ?? "10000"
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
        status: ["ok", "healthy", "ready"].includes(providerHealth)
          ? "ok"
          : "degraded",
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

function normalizeRemoteProviderStatus(
  payload: {
    status?: string;
    externalReference?: string;
    signedAt?: string;
    evidence?: Record<string, unknown>;
  },
  fallbackReference: string
): SignatureProviderStatusResult {
  const normalizedStatus = (payload.status ?? "pending").toLowerCase();

  if (["signed", "completed", "success"].includes(normalizedStatus)) {
    return {
      status: "signed",
      externalReference: payload.externalReference ?? fallbackReference,
      signedAt: payload.signedAt ?? new Date().toISOString(),
      providerStatus: normalizedStatus,
      evidence: payload.evidence ?? {}
    };
  }

  if (["failed", "rejected", "error", "cancelled"].includes(normalizedStatus)) {
    return {
      status: "failed",
      externalReference: payload.externalReference ?? fallbackReference,
      providerStatus: normalizedStatus,
      evidence: payload.evidence ?? {}
    };
  }

  return {
    status: "pending",
    externalReference: payload.externalReference ?? fallbackReference,
    providerStatus: normalizedStatus,
    evidence: payload.evidence ?? {}
  };
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
