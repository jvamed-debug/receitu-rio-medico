export const appConfig = {
  appName: "receituario-api",
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: process.env.DATABASE_URL ?? "",
  redisUrl: process.env.REDIS_URL ?? "",
  storage: {
    endpoint: process.env.STORAGE_ENDPOINT ?? process.env.S3_ENDPOINT ?? "",
    bucket: process.env.STORAGE_BUCKET ?? process.env.S3_BUCKET ?? "",
    region: process.env.STORAGE_REGION ?? process.env.S3_REGION ?? "us-east-1"
  },
  oidc: {
    issuerUrl: process.env.OIDC_ISSUER_URL ?? "",
    clientId: process.env.OIDC_CLIENT_ID ?? ""
  },
  signature: {
    provider: process.env.SIGNATURE_PROVIDER ?? "icp-brasil-vendor",
    baseUrl: process.env.SIGNATURE_PROVIDER_BASE_URL ?? ""
  }
};
