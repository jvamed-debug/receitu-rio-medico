export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface BiometricEnrollmentInput {
  platform: "ios" | "android";
  publicKey: string;
}

export interface AccessPrincipal {
  userId: string;
  professionalId?: string;
  roles: string[];
}
