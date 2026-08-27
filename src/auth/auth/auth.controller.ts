import {
  Controller, Post, Get, Body, Req, Param,
  Delete, Patch, UseGuards, ForbiddenException, HttpCode, HttpStatus, NotFoundException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard, JwtRefreshGuard } from '../../common/guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Throttle } from '@nestjs/throttler';
import { AuditLogAction } from '../../common/decorators/audit.decorator';
import * as bcrypt from 'bcrypt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() body: RegisterDto) {
    return this.authService.register(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @AuditLogAction('LOGIN', 'User')
  login(@Body() body: LoginDto) {
    return this.authService.login(body);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  refreshTokens(@Req() req: any) {
    const userId = req.user.sub;
    const refreshToken = req.user.refreshToken;
    return this.authService.refreshTokens(userId, refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @AuditLogAction('LOGOUT', 'User')
  logout(@Req() req: any) {
    return this.authService.logout(req.user.sub);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.authService.me(req.user.sub);
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getUsers(@Req() req: any) {
    const user = req.user;

    if (user.role === Role.SUPER_ADMIN) {
      return this.usersService.findAll();
    }

    if (user.role === Role.ORG_ADMIN) {
      // Use organizationId from JWT; fall back to DB lookup if missing
      let orgId = user.organizationId;
      if (!orgId) {
        const freshUser = await this.usersService.findById(user.sub);
        orgId = freshUser?.organizationId;
      }
      if (!orgId) return [];
      // Return all users in their own org (including ORG_ADMIN and ENUMERATORs)
      const members = await this.usersService.findAll(orgId);
      return members;
    }

    return [];
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction('USER_CREATE', 'User')
  createUser(@Body() body: any, @Req() req: any) {
    if (req.user.role === Role.ENUMERATOR) {
      throw new ForbiddenException('Insufficient permissions to create users');
    }

    if (req.user.role === Role.ORG_ADMIN) {
      if (body.role && body.role !== Role.ENUMERATOR) {
        throw new ForbiddenException('Organization Admins can only create Enumerators');
      }
      if (body.organizationId && body.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Cannot create users for another organization');
      }
      body.organizationId = req.user.organizationId;
      body.role = Role.ENUMERATOR;
    }

    return this.usersService.create({ ...body });
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction('USER_DELETE', 'User')
  async deleteUser(@Param('id') id: string, @Req() req: any) {
    if (req.user.role === Role.ENUMERATOR) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (req.user.role === Role.ORG_ADMIN) {
      const targetUser = await this.usersService.findById(id);
      if (!targetUser || targetUser.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Cannot delete users outside your organization');
      }
      if (targetUser.role === Role.SUPER_ADMIN || targetUser.role === Role.ORG_ADMIN) {
         throw new ForbiddenException('Cannot delete this user');
      }
    }

    return this.usersService.remove(id, req.user.sub);
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction('USER_UPDATE_ROLE', 'User')
  async updateRole(@Param('id') id: string, @Body() body: { role: Role }, @Req() req: any) {
    if (req.user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Only Super Admin can change user roles');
    }
    return this.usersService.updateRole(id, body.role);
  }

  @Patch('users/:id')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction('USER_UPDATE', 'User')
  async updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; password?: string; role?: Role; organizationId?: string | null; status?: string },
    @Req() req: any
  ) {
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }

    if (req.user.role === Role.ENUMERATOR) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (req.user.role === Role.ORG_ADMIN) {
      if (targetUser.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Cannot edit users outside your organization');
      }
      if (targetUser.role === Role.SUPER_ADMIN || targetUser.role === Role.ORG_ADMIN) {
         throw new ForbiddenException('Cannot edit this user');
      }
      // ORG_ADMIN cannot change org or elevate role
      if (body.organizationId && body.organizationId !== req.user.organizationId) {
        throw new ForbiddenException('Cannot move users to another organization');
      }
      if (body.role && body.role !== Role.ENUMERATOR) {
        throw new ForbiddenException('Cannot grant admin roles');
      }
    }

    const updateData: any = {
      name: body.name,
      email: body.email,
      role: body.role,
      organizationId: body.organizationId,
      status: body.status,
    };

    if (body.password) {
      updateData.passwordHash = await bcrypt.hash(body.password, 10);
    }

    return this.usersService.update(id, updateData);
  }



  @Get('logs')
  @UseGuards(JwtAuthGuard)
  async getLogs(@Req() req: any) {
    if (req.user.role !== Role.SUPER_ADMIN && req.user.role !== Role.ORG_ADMIN) {
      throw new ForbiddenException('Only admins can view logs');
    }
    
    let whereClause = {};
    if (req.user.role === Role.ORG_ADMIN) {
      whereClause = { organizationId: req.user.organizationId };
    }
    
    const logs = await this.prisma.auditLog.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { user: true }
    });

    return logs.map(log => ({
      id: log.id,
      action: log.action,
      userEmail: log.user?.email || 'System',
      userName: log.user?.name || '',
      userRole: log.user?.role || '',
      timestamp: log.createdAt,
      details: log.metadata && Object.keys(log.metadata as object).length > 0
        ? JSON.stringify(log.metadata)
        : (log.entityType ? `${log.entityType} action` : 'Action performed')
    }));
  }

  @Get('users/:id/village-access')
  @UseGuards(JwtAuthGuard)
  async getVillageAccess(@Param('id') id: string, @Req() req: any) {
    if (req.user.role !== Role.SUPER_ADMIN && req.user.role !== Role.ORG_ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (req.user.role === Role.ORG_ADMIN && targetUser.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Cannot view users outside your organization');
    }
    return this.usersService.getVillageAccess(id);
  }

  @Post('users/:id/village-access')
  @UseGuards(JwtAuthGuard)
  @AuditLogAction('USER_ASSIGN_VILLAGES', 'User')
  async updateVillageAccess(@Param('id') id: string, @Body() body: { villages: string[] }, @Req() req: any) {
    if (req.user.role !== Role.SUPER_ADMIN && req.user.role !== Role.ORG_ADMIN) {
      throw new ForbiddenException('Insufficient permissions');
    }
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    if (req.user.role === Role.ORG_ADMIN && targetUser.organizationId !== req.user.organizationId) {
      throw new ForbiddenException('Cannot modify users outside your organization');
    }
    return this.usersService.updateVillageAccess(id, body.villages);
  }
}
