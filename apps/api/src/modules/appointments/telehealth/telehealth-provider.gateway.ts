import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  TelehealthRoomProvisionInput,
  TelehealthRoomProvisionResult
} from "./telehealth-provider.port";

@Injectable()
export class TelehealthProviderGateway {
  constructor(private readonly configService: ConfigService) {}

  async provisionRoom(
    input: TelehealthRoomProvisionInput
  ): Promise<TelehealthRoomProvisionResult> {
    if (this.getProviderMode() === "mock") {
      const provider = this.getProviderName();
      const roomId = input.existingRoomId ?? `tele-${input.appointmentId}`;
      const baseUrl =
        this.configService.get<string>("TELEHEALTH_PROVIDER_JOIN_BASE_URL") ??
        "https://telemed.receituario.local";

      return {
        provider,
        roomId,
        joinUrl: `${baseUrl.replace(/\/$/, "")}/rooms/${roomId}`,
        metadata: {
          providerMode: "mock",
          provider,
          roomId
        }
      };
    }

    const baseUrl = this.configService.get<string>("TELEHEALTH_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("TELEHEALTH_PROVIDER_API_KEY");
    const timeoutMs = Number(
      this.configService.get<string>("TELEHEALTH_PROVIDER_TIMEOUT_MS") ?? "10000"
    );

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider de teleconsulta configurado sem base URL ou API key"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rooms`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
          "x-telehealth-provider": this.getProviderName()
        },
        body: JSON.stringify(input),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Provider de teleconsulta respondeu com status ${response.status}`
        );
      }

      const payload = (await response.json()) as {
        provider?: string;
        roomId?: string;
        joinUrl?: string;
        metadata?: Record<string, unknown>;
      };

      if (!payload.provider || !payload.roomId || !payload.joinUrl) {
        throw new ServiceUnavailableException(
          "Provider de teleconsulta retornou payload incompleto"
        );
      }

      return {
        provider: payload.provider,
        roomId: payload.roomId,
        joinUrl: payload.joinUrl,
        metadata: payload.metadata ?? {}
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Falha ao comunicar com provider de teleconsulta: ${error.message}`
          : "Falha ao comunicar com provider de teleconsulta"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getProviderMode() {
    return (
      this.configService.get<string>("TELEHEALTH_PROVIDER_MODE") ?? "mock"
    ).toLowerCase();
  }

  private getProviderName() {
    return (
      this.configService.get<string>("TELEHEALTH_PROVIDER_NAME") ?? "bluecare-meet"
    ).trim();
  }
}
