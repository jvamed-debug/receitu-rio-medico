import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { ProfessionalStatus, SignatureProvider, UserRole } from "@prisma/client";

import { PrismaService } from "../../persistence/prisma.service";
import { hashPassword, verifyPassword } from "./auth.crypto";
import { signToken, verifyToken } from "./auth.tokens";
import { ensureRecentStepUp } from "./step-up.util";
import type {
  BiometricEnrollmentInput,
  LoginInput,
  RefreshInput,
  RegisterInput,
  StepUpInput
} from "./auth.types";

@Injectable()
export class AuthService {
  private readonly accessTokenTtlMs = 1000 * 60 * 60;
  private readonly refreshTokenTtlMs = 1000 * 60 * 60 * 24 * 15;
  private readonly stepUpTtlMs = 1000 * 60 * 10;

  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterInput) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email }
    });

    if (existingUser) {
      throw new ConflictException("Ja existe usuario com este e-mail");
    }

    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        fullName: input.fullName,
        passwordHash: hashPassword(input.password)
      }
    });

    const professionalProfile = await this.prisma.professionalProfile.create({
      data: {
        userId: user.id,
        documentNumber: "pendente",
        councilType: "CRM",
        councilState: "SP",
        status: ProfessionalStatus.PENDING_VALIDATION
      }
    });

    const organization = await this.prisma.organization.create({
      data: {
        name: `Clinica de ${user.fullName}`,
        slug: buildOrganizationSlug(user.fullName, user.id)
      }
    });

    await this.prisma.organizationMembership.create({
      data: {
        organizationId: organization.id,
        professionalId: professionalProfile.id,
        membershipRole: "owner",
        isDefault: true
      }
    });

    await this.prisma.professionalProfile.update({
      where: { id: professionalProfile.id },
      data: {
        primaryOrganizationId: organization.id
      }
    });

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      status: "pending_validation"
    };
  }

  async login(input: LoginInput) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: {
        professionalProfile: {
          include: {
            primaryOrganization: true
          }
        }
      }
    });

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("Credenciais invalidas");
    }

    return this.issueTokens(
      user.id,
      user.email,
      [mapRole(user.role)],
      user.professionalProfile?.id,
      {
        organizationId: user.professionalProfile?.primaryOrganizationId ?? undefined
      }
    );
  }

  async refresh(input: RefreshInput) {
    const payload = verifyToken(input.refreshToken, this.getTokenSecret());

    if (!payload || payload.type !== "refresh") {
      throw new UnauthorizedException("Refresh token invalido");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: {
        professionalProfile: {
          include: {
            primaryOrganization: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Usuario nao encontrado");
    }

    return this.issueTokens(
      user.id,
      user.email,
      [mapRole(user.role)],
      user.professionalProfile?.id,
      {
        organizationId: user.professionalProfile?.primaryOrganizationId ?? undefined
      }
    );
  }

  async stepUp(authorization: string | undefined, input: StepUpInput) {
    const principal = await this.getPrincipalFromAuthorization(authorization);

    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      include: {
        professionalProfile: {
          include: {
            primaryOrganization: true
          }
        }
      }
    });

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new UnauthorizedException("Credenciais invalidas para elevacao de sessao");
    }

    return this.issueTokens(
      user.id,
      user.email,
      [mapRole(user.role)],
      user.professionalProfile?.id,
      {
        organizationId: user.professionalProfile?.primaryOrganizationId ?? undefined,
        stepUpUntil: Date.now() + this.stepUpTtlMs
      }
    );
  }

  enrollBiometric(input: BiometricEnrollmentInput) {
    return {
      enrolled: true,
      platform: input.platform
    };
  }

  async me(authorization?: string) {
    const principal = await this.getPrincipalFromAuthorization(authorization);

    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      include: {
        professionalProfile: {
          include: {
            primaryOrganization: true
          }
        }
      }
    });

    if (!user) {
      throw new UnauthorizedException("Sessao invalida");
    }

    return {
      userId: user.id,
      professionalId: user.professionalProfile?.id,
      organizationId: user.professionalProfile?.primaryOrganizationId ?? undefined,
      email: user.email,
      fullName: user.fullName,
      roles: principal.roles,
      stepUpUntil: principal.stepUpUntil,
      professionalProfile: user.professionalProfile,
      organization: user.professionalProfile?.primaryOrganization
        ? {
            id: user.professionalProfile.primaryOrganization.id,
            name: user.professionalProfile.primaryOrganization.name,
            slug: user.professionalProfile.primaryOrganization.slug
          }
        : null
    };
  }

  async updateProfessionalProfile(
    authorization: string | undefined,
    input: Record<string, unknown>
  ) {
    const principal = await this.getPrincipalFromAuthorization(authorization);
    ensureRecentStepUp(principal, "update_professional_profile");

    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      include: {
        professionalProfile: {
          include: {
            primaryOrganization: true
          }
        }
      }
    });

    if (!user?.professionalProfile) {
      throw new UnauthorizedException("Perfil profissional nao encontrado");
    }

    const profile = await this.prisma.professionalProfile.update({
      where: { id: user.professionalProfile.id },
      data: {
        documentNumber: stringOrDefault(input.documentNumber, user.professionalProfile.documentNumber),
        councilType: stringOrDefault(input.councilType, user.professionalProfile.councilType),
        councilState: stringOrDefault(input.councilState, user.professionalProfile.councilState),
        rqe: stringOrNullable(input.rqe),
        cbo: stringOrNullable(input.cbo),
        specialty: stringOrNullable(input.specialty),
        cnes: stringOrNullable(input.cnes),
        status:
          stringOrDefault(input.status, user.professionalProfile.status) === "ACTIVE"
            ? ProfessionalStatus.ACTIVE
            : ProfessionalStatus.PENDING_VALIDATION
      }
    });

    return {
      updated: true,
      profile
    };
  }

  async createSignatureMethod(
    authorization: string | undefined,
    input: Record<string, unknown>
  ) {
    const principal = await this.getPrincipalFromAuthorization(authorization);
    ensureRecentStepUp(principal, "configure_signature_method");

    const user = await this.prisma.user.findUnique({
      where: { id: principal.userId },
      include: {
        professionalProfile: {
          include: {
            primaryOrganization: true
          }
        }
      }
    });

    if (!user?.professionalProfile) {
      throw new UnauthorizedException("Perfil profissional nao encontrado");
    }

    const profile = await this.prisma.professionalProfile.update({
      where: { id: user.professionalProfile.id },
      data: {
        signatureProvider:
          stringOrDefault(input.provider, "ICP_BRASIL_VENDOR") === "GOVBR_VENDOR"
            ? SignatureProvider.GOVBR_VENDOR
            : SignatureProvider.ICP_BRASIL_VENDOR,
        signatureValidatedAt: new Date()
      }
    });

    return {
      created: true,
      method: {
        provider: profile.signatureProvider,
        validatedAt: profile.signatureValidatedAt
      }
    };
  }

  private async getPrincipalFromAuthorization(authorization?: string) {
    const token = authorization?.replace(/^Bearer\s+/i, "");

    if (!token) {
      throw new UnauthorizedException("Token de acesso ausente");
    }

    const payload = verifyToken(token, this.getTokenSecret());

    if (!payload || payload.type !== "access") {
      throw new UnauthorizedException("Token de acesso invalido");
    }

    return {
      userId: payload.sub,
      roles: payload.roles,
      professionalId: payload.professionalId,
      organizationId: payload.organizationId,
      stepUpUntil: payload.stepUpUntil
    };
  }

  private issueTokens(
    userId: string,
    email: string,
    roles: string[],
    professionalId?: string,
    options?: {
      organizationId?: string;
      stepUpUntil?: number;
    }
  ) {
    const accessToken = signToken(
      {
        sub: userId,
        email,
        roles,
        professionalId,
        organizationId: options?.organizationId,
        stepUpUntil: options?.stepUpUntil,
        type: "access",
        exp: Date.now() + this.accessTokenTtlMs
      },
      this.getTokenSecret()
    );

    const refreshToken = signToken(
      {
        sub: userId,
        email,
        roles,
        professionalId,
        organizationId: options?.organizationId,
        type: "refresh",
        exp: Date.now() + this.refreshTokenTtlMs
      },
      this.getTokenSecret()
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(this.accessTokenTtlMs / 1000)
    };
  }

  private getTokenSecret() {
    return process.env.AUTH_TOKEN_SECRET || "receituario-dev-secret";
  }
}

function stringOrDefault(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function stringOrNullable(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function mapRole(role: UserRole) {
  return role.toLowerCase();
}

function buildOrganizationSlug(fullName: string, userId: string) {
  const normalized = fullName
    .normalize("NFD")
    .replace(/[^\w\s-]/g, "")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .slice(0, 40);

  const suffix = userId.slice(0, 6).toLowerCase();
  return `${normalized || "clinica"}-${suffix}`;
}
