"use client";

const defaultLocalApiBaseUrl = "http://localhost:3333";

export function getBrowserApiBaseUrl() {
  if (typeof window === "undefined") {
    return defaultLocalApiBaseUrl;
  }

  const configuredBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configuredBaseUrl && configuredBaseUrl.trim().length > 0) {
    return configuredBaseUrl;
  }

  const currentUrl = new URL(window.location.href);

  if (currentUrl.hostname.includes("easypanel.host")) {
    const apiHostname = currentUrl.hostname.startsWith("api-")
      ? currentUrl.hostname
      : `api-${currentUrl.hostname}`;

    currentUrl.hostname = apiHostname;
    currentUrl.pathname = "";
    currentUrl.search = "";
    currentUrl.hash = "";

    return currentUrl.origin;
  }

  return `${currentUrl.protocol}//${currentUrl.hostname}:3001`;
}
