import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import wechatConfig, { jwtConfig } from './config/wechat.config';
import { PrismaModule } from '@/prisma/prisma.module';
import { WechatApiService, AuthService } from './services';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UserAuthController } from './user-auth.controller';

/**
 * 用户认证模块
 * 提供微信授权登录和JWT认证功能
 */
@Module({
  imports: [
    // 注册微信配置
    ConfigModule.forFeature(wechatConfig),
    // 注册 JWT 配置
    ConfigModule.forFeature(jwtConfig),

    // Passport 模块
    PassportModule.register({ defaultStrategy: 'jwt' }),

    // JWT 模块配置
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.secret');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('jwt.expiresIn') || '7d') as string,
          },
        };
      },
    }),

    // HTTP 客户端（用于调用微信API）
    HttpModule,

    // Prisma 模块（用于数据库操作）
    PrismaModule,
  ],
  controllers: [UserAuthController],
  providers: [
    WechatApiService, // 微信API服务
    AuthService, // 认证业务服务
    JwtStrategy, // JWT验证策略
  ],
  exports: [
    AuthService, // 导出供其他模块使用（如订单模块需要验证用户）
    JwtStrategy, // 导出JWT策略
  ],
})
export class UserAuthModule {}
