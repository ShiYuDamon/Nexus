import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LocalStrategy } from './strategies/local.strategy';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
  UsersModule,
  PassportModule,
  JwtModule.register({
    secret: process.env.JWT_SECRET || 'nexus-development-secret-key',
    signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  })],

  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy],
  exports: [AuthService]
})export class
AuthModule {}