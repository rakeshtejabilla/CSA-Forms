import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../auth/prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }
    return org;
  }

  async create(data: { name: string; code: string; description?: string; email?: string; phone?: string; address?: string; createdById: string }) {
    const existing = await this.prisma.organization.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new ConflictException(`Organization with code ${data.code} already exists`);
    }
    return this.prisma.organization.create({ data });
  }

  async update(id: string, data: { name?: string; code?: string; description?: string; email?: string; phone?: string; address?: string; status?: string }) {
    if (data.code) {
      const existing = await this.prisma.organization.findUnique({ where: { code: data.code } });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Organization with code ${data.code} already exists`);
      }
    }
    return this.prisma.organization.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.organization.delete({
      where: { id },
    });
  }
}
