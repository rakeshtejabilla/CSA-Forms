import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './common/guards/auth.guard';

@Controller()
export class GatewayController {
  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'modular-monolith-api', timestamp: new Date() };
  }

  @Get('verify')
  @UseGuards(JwtAuthGuard)
  verifyToken(@Req() req: any) {
    return { valid: true, user: req.user };
  }
}
