import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  ReminderDispatchInput,
  ReminderDispatchResult
} from "./reminder-provider.port";

@Injectable()
export class ReminderProviderGateway {
  constructor(private readonly configService: ConfigService) {}

  async dispatch(
    input: ReminderDispatchInput
  ): Promise<ReminderDispatchResult> {
    if (this.getProviderMode() === "mock") {
      const deliveredAt = new Date().toISOString();
      return {
        providerReference: `reminder-${input.channel}-${input.reminderId}`,
        deliveredAt,
        providerMetadata: {
          providerMode: "mock",
          channel: input.channel,
          deliveredAt
        }
      };
    }

    const baseUrl = this.configService.get<string>("REMINDER_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("REMINDER_PROVIDER_API_KEY");
    const timeoutMs = Number(
      this.configService.get<string>("REMINDER_PROVIDER_TIMEOUT_MS") ?? "10000"
    );

    if (!baseUrl || !apiKey) {
      throw new ServiceUnavailableException(
        "Provider de lembretes configurado sem base URL ou API key"
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/reminders/send`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(input),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new ServiceUnavailableException(
          `Provider de lembretes respondeu com status ${response.status}`
        );
      }

      const payload = (await response.json()) as {
        providerReference?: string;
        deliveredAt?: string;
        providerMetadata?: Record<string, unknown>;
      };

      if (!payload.providerReference || !payload.deliveredAt) {
        throw new ServiceUnavailableException(
          "Provider de lembretes retornou payload incompleto"
        );
      }

      return {
        providerReference: payload.providerReference,
        deliveredAt: payload.deliveredAt,
        providerMetadata: payload.providerMetadata ?? {}
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      throw new ServiceUnavailableException(
        error instanceof Error
          ? `Falha ao comunicar com provider de lembretes: ${error.message}`
          : "Falha ao comunicar com provider de lembretes"
      );
    } finally {
      clearTimeout(timeout);
    }
  }

  private getProviderMode() {
    return (this.configService.get<string>("REMINDER_PROVIDER_MODE") ?? "mock").toLowerCase();
  }
}
