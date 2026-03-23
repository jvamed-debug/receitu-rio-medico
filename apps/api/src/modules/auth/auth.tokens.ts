import { createHmac } from "node:crypto";

export interface AuthTokenPayload {
  sub: string;
  email: string;
  roles: string[];
  professionalId?: string;
  organizationId?: string;
  stepUpUntil?: number;
  type: "access" | "refresh";
  exp: number;
}

function base64UrlEncode(input: string) {
  return Buffer.from(input).toString("base64url");
}

function base64UrlDecode(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function signValue(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function signToken(payload: AuthTokenPayload, secret: string) {
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signValue(encodedPayload, secret);
  return `${encodedPayload}.${signature}`;
}

export function verifyToken(token: string, secret: string): AuthTokenPayload | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = signValue(encodedPayload, secret);

  if (signature !== expectedSignature) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;

  if (payload.exp < Date.now()) {
    return null;
  }

  return payload;
}
