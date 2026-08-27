import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../forms/prisma/prisma.service';

@Injectable()
export class FarmersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user: any) {
    const where: any = {};
    if (user.role !== 'SUPER_ADMIN') {
      where.organizationId = user.organizationId;
    }

    // Scoping to allowed villages for ENUMERATOR
    if (user.role === 'ENUMERATOR') {
      const allowed = await this.prisma.userVillageAccess.findMany({
        where: { userId: user.sub },
        select: { villageName: true },
      });
      const villageNames = allowed.map(v => v.villageName);
      where.village = { in: villageNames };
    }

    return this.prisma.farmer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user: any) {
    const farmer = await this.prisma.farmer.findUnique({ where: { id } });
    if (!farmer) {
      throw new NotFoundException(`Farmer with ID ${id} not found`);
    }
    if (user.role !== 'SUPER_ADMIN' && farmer.organizationId !== user.organizationId) {
      throw new ForbiddenException(`You do not have access to this farmer record`);
    }
    return farmer;
  }

  async create(data: any, user: any) {
    const organizationId = user.role === 'SUPER_ADMIN' ? data.organizationId : user.organizationId;
    return this.prisma.farmer.create({
      data: {
        name: data.name,
        age: parseInt(data.age || '0', 10),
        phoneNumber: data.phoneNumber || '',
        aadhaarNumber: data.aadhaarNumber || '',
        cropName: data.cropName || '',
        landSizeAcres: parseFloat(data.landSizeAcres || '0'),
        state: data.state || '',
        district: data.district || '',
        mandal: data.mandal || '',
        village: data.village || '',
        organizationId,
        assignedOrganization: data.assignedOrganization || null,
        estimatedYield: data.estimatedYield || null,
        timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });
  }

  async update(id: string, data: any, user: any) {
    if (user.role === 'ENUMERATOR') {
      throw new ForbiddenException('Enumerators cannot edit farmer records');
    }
    await this.findOne(id, user);
    return this.prisma.farmer.update({
      where: { id },
      data: {
        name: data.name,
        age: data.age !== undefined ? parseInt(data.age || '0', 10) : undefined,
        phoneNumber: data.phoneNumber,
        aadhaarNumber: data.aadhaarNumber,
        cropName: data.cropName,
        landSizeAcres: data.landSizeAcres !== undefined ? parseFloat(data.landSizeAcres || '0') : undefined,
        state: data.state,
        district: data.district,
        mandal: data.mandal,
        village: data.village,
        assignedOrganization: data.assignedOrganization,
        estimatedYield: data.estimatedYield,
        timestamp: data.timestamp ? new Date(data.timestamp) : undefined,
      },
    });
  }

  async remove(id: string, user: any) {
    if (user.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only Super Admins can delete farmer records');
    }
    await this.findOne(id, user);
    return this.prisma.farmer.delete({
      where: { id },
    });
  }
}
