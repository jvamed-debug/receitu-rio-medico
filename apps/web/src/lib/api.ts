import { ApiClient } from "@receituario/api-client";
import { cookies } from "next/headers";

const defaultBaseUrl = "http://localhost:3333";

export function getApiBaseUrl() {
  return (
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_API_BASE_URL ??
    defaultBaseUrl
  );
}

export function createApiClient(accessToken?: string) {
  return new ApiClient(getApiBaseUrl(), accessToken);
}

export async function createServerApiClient() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("receituario_access_token")?.value;
  return new ApiClient(getApiBaseUrl(), accessToken);
}
