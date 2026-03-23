import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SignatureProvider } from "@prisma/client";

import type {
  SignatureProviderExecutionInput,
  SignatureProviderExecutionResult
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

  private getProviderMode() {
    return (
      this.configService.get<string>("SIGNATURE_PROVIDER_MODE") ?? "mock"
    ).toLowerCase();
  }
}
