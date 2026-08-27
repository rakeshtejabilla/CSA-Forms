import { Module } from '@nestjs/common';
import { FarmersController } from './farmers.controller';
import { FarmersService } from './farmers.service';
import { PrismaService } from '../forms/prisma/prisma.service';

@Module({
  controllers: [FarmersController],
  providers: [FarmersService, PrismaService],
})
export class FarmersModule {}
