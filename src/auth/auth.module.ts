import { Module } from '@nestjs/common';
import { AuthAuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthAuthModule, UsersModule],
})
export class AuthModule {}
