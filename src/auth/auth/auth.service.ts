import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  private get jwtSecret(): string {
    return process.env.JWT_SECRET || 'super-secret-key-change-in-production';
  }

  private get jwtExpiry(): string {
    return process.env.JWT_EXPIRY || '15m';
  }

  private get jwtRefreshSecret(): string {
    return process.env.JWT_REFRESH_SECRET || 'super-secret-refresh-key-change-in-production';
  }

  private get jwtRefreshExpiry(): string {
    return process.env.JWT_REFRESH_EXPIRY || '7d';
  }

  async getTokens(userId: string, email: string, role: Role, organizationId?: string, name?: string, organizationName?: string) {
    const payload = { sub: userId, email, role, organizationId, name, organizationName };
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtSecret,
        expiresIn: this.jwtExpiry,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtRefreshSecret,
        expiresIn: this.jwtRefreshExpiry,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(userId, hashedRefreshToken);
  }

  async register(dto: { email: string; password: string; name: string; role?: Role; organizationId?: string }) {
    const user = await this.usersService.create(dto);
    const tokens = await this.getTokens(user.id, user.email, user.role, user.organizationId, user.name, user['organization']?.name);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return { user, tokens };
  }

  async login(dto: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException('Your account is inactive. Please contact your administrator.');
    }
    if (user.role !== 'SUPER_ADMIN' && (user as any).organization?.status === 'INACTIVE') {
      throw new UnauthorizedException('Your organization is inactive. Please contact support.');
    }
    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const tokens = await this.getTokens(user.id, user.email, user.role, user.organizationId, user.name, user.organization?.name);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId, organizationName: user.organization?.name },
      tokens,
    };
  }

  async logout(userId: string) {
    await this.usersService.removeRefreshToken(userId);
  }

  async refreshTokens(userId: string, refreshToken: string) {
    const user = await this.usersService.findById(userId);
    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }
    const refreshTokenMatches = await bcrypt.compare(refreshToken, user.hashedRefreshToken);
    if (!refreshTokenMatches) {
      throw new ForbiddenException('Access Denied');
    }
    const tokens = await this.getTokens(user.id, user.email, user.role, user.organizationId, user.name, user.organization?.name);
    await this.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async me(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role, organizationId: user.organizationId, organizationName: user.organization?.name };
  }
}
