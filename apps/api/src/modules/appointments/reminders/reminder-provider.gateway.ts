import {
  Injectable,
  ServiceUnavailableException
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import type {
  ReminderDispatchInput,
  ReminderDispatchResult,
  ReminderProviderReadinessResult
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

  async getReadiness(): Promise<ReminderProviderReadinessResult> {
    const mode = this.getProviderMode();
    const checkedAt = new Date().toISOString();
    const baseUrl = this.configService.get<string>("REMINDER_PROVIDER_BASE_URL");
    const apiKey = this.configService.get<string>("REMINDER_PROVIDER_API_KEY");
    const issues: string[] = [];

    if (mode === "mock") {
      return {
        mode,
        checkedAt,
        configured: true,
        capabilities: {
          dispatch: true,
          deliveryCallbackSupport: false
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
      issues.push("REMINDER_PROVIDER_BASE_URL ou REMINDER_PROVIDER_API_KEY ausentes");
      return {
        mode,
        checkedAt,
        configured: false,
        capabilities: {
          dispatch: false,
          deliveryCallbackSupport: false
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

    const healthResult = await this.checkRemoteHealth(baseUrl, apiKey);

    if (healthResult.status !== "ok") {
      issues.push(
        healthResult.status === "degraded"
          ? "Provider de lembretes retornou estado degradado"
          : "Provider de lembretes indisponivel"
      );
    }

    return {
      mode,
      checkedAt,
      configured: true,
      capabilities: {
        dispatch: true,
        deliveryCallbackSupport: false
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

  private getProviderMode() {
    return (this.configService.get<string>("REMINDER_PROVIDER_MODE") ?? "mock").toLowerCase() as
      | "mock"
      | "remote";
  }

  private async checkRemoteHealth(baseUrl: string, apiKey: string) {
    const timeoutMs = Number(
      this.configService.get<string>("REMINDER_PROVIDER_TIMEOUT_MS") ?? "10000"
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
