import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto, LoginDto, RefreshTokenDto } from '@nexus-main/common';

@Controller('api/auth')export class
AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body()registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request()req) {
    return this.authService.login(req.user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('refresh')
  async refreshToken(@Request()req, @Body()refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(req.user.userId, req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout() {

    return { success: true };
  }
}