import { Controller, Get } from "@nestjs/common";

import { appConfig } from "../../config/app.config";
import { PrismaService } from "../../persistence/prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Get()
  async getHealth() {
    const databaseReady = await this.isDatabaseReady();

    return {
      status: databaseReady ? "ok" : "degraded",
      service: appConfig.appName,
      environment: appConfig.nodeEnv,
      timestamp: new Date().toISOString(),
      dependencies: {
        databaseConfigured: Boolean(appConfig.databaseUrl),
        prismaClientReady: databaseReady,
        redisConfigured: Boolean(appConfig.redisUrl),
        storageConfigured: Boolean(appConfig.storage.endpoint),
        oidcConfigured: Boolean(appConfig.oidc.issuerUrl),
        signatureConfigured: Boolean(appConfig.signature.baseUrl)
      }
    };
  }

  @Get("live")
  getLive() {
    return {
      status: "ok",
      service: appConfig.appName,
      environment: appConfig.nodeEnv,
      timestamp: new Date().toISOString()
    };
  }

  @Get("ready")
  async getReady() {
    const databaseReady = await this.isDatabaseReady();
    const ready =
      databaseReady &&
      Boolean(appConfig.databaseUrl) &&
      Boolean(appConfig.storage.endpoint) &&
      Boolean(appConfig.storage.bucket);

    return {
      status: ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: databaseReady,
        storageEndpoint: Boolean(appConfig.storage.endpoint),
        storageBucket: Boolean(appConfig.storage.bucket)
      }
    };
  }

  private async isDatabaseReady() {
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
