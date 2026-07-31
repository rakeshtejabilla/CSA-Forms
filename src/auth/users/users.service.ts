import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(organizationId?: string) {
    if (organizationId) {
      return this.prisma.user.findMany({
        where: { organizationId },
        select: { id: true, email: true, name: true, role: true, organizationId: true, status: true, createdAt: true },
      });
    }
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, organizationId: true, status: true, createdAt: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { organization: true },
    });
  }

  async create(dto: { email: string; password: string; name: string; role?: Role; organizationId?: string }) {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User with this email already exists');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: hashedPassword,
        name: dto.name,
        role: dto.role || Role.ENUMERATOR,
        organizationId: dto.organizationId,
      },
      select: { id: true, email: true, name: true, role: true, organizationId: true, status: true, createdAt: true },
    });
  }

  async updateRole(id: string, role: Role) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true, organizationId: true },
    });
  }

  async update(id: string, data: { name?: string; email?: string; passwordHash?: string; role?: Role; organizationId?: string | null; status?: string }) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.prisma.user.update({
      where: { id },
      data: {
        name: data.name,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        organizationId: data.organizationId,
        status: data.status,
      },
      select: { id: true, email: true, name: true, role: true, organizationId: true, status: true },
    });
  }

  async updateRefreshToken(id: string, hashedRefreshToken: string) {
    await this.prisma.user.update({
      where: { id },
      data: { hashedRefreshToken },
    });
  }

  async removeRefreshToken(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { hashedRefreshToken: null },
    });
  }

  async remove(id: string, deletedBy: string) {
    const user = await this.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
