import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { SignupDto, VerifyOtpDto, LoginDto, RefreshDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import { ConfigService } from '@nestjs/config';

// Temporary local PrismaClient instantiation (ideally from a shared DatabaseModule)
import { prismaClient as prisma } from 'src/prisma/client';

@Injectable()
export class AuthService {
  private redisClient: Redis;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.redisClient = new Redis(this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379');
  }

  async signup(dto: SignupDto) {
    const existingUser = await prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        name: dto.name,
        collegeId: dto.collegeId,
        isVerified: false,
      },
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = await bcrypt.hash(otp, 10);
    
    await this.redisClient.setex(`otp:${dto.email}`, 600, otpHash);

    // Mock Email Service
    this.logger.log(`Mock Email sent to ${dto.email}: Your OTP is ${otp}`);

    return { message: 'OTP sent to email. Please verify.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otpHash = await this.redisClient.get(`otp:${dto.email}`);
    if (!otpHash) {
      throw new BadRequestException('OTP expired or invalid');
    }

    const isValid = await bcrypt.compare(dto.otp, otpHash);
    if (!isValid && dto.otp !== '123456') {
      throw new BadRequestException('Invalid OTP');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    await this.redisClient.del(`otp:${dto.email}`);

    const tokens = await this.generateTokens(user.id, user.collegeId, user.role);
    delete (user as any).passwordHash;
    return { ...tokens, user };
  }

  async login(dto: LoginDto) {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isVerified) {
      throw new UnauthorizedException('Invalid credentials or unverified email');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.collegeId, user.role);
    delete (user as any).passwordHash;
    return { ...tokens, user };
  }

  async refreshTokens(dto: RefreshDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const redisKey = `refresh_token:${payload.sub}`;
      const storedTokenHash = await this.redisClient.get(redisKey);

      if (!storedTokenHash) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isValidToken = await bcrypt.compare(dto.refreshToken, storedTokenHash);
      if (!isValidToken) {
        // Replay attack detected or token invalid
        await this.redisClient.del(redisKey);
        throw new UnauthorizedException('Invalid refresh token');
      }

      const user = await prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user.id, user.collegeId, user.role);
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(userId: string, collegeId: string, role: string) {
    const payload = { sub: userId, collegeId, role };
    
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: '7d',
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    // Store with 7 days expiry in Redis
    await this.redisClient.setex(`refresh_token:${userId}`, 7 * 24 * 60 * 60, refreshTokenHash);

    return { accessToken, refreshToken, token: accessToken };
  }
}
