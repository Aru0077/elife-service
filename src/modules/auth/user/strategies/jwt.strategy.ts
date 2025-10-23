import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigType } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../config/wechat.config';
import { AuthService } from '../services/auth.service';
import { JwtPayload } from '../interfaces/wechat-auth.interface';
import { User } from '@prisma/client';

/**
 * JWT 认证策略
 * 用于验证 JWT token 并提取用户信息
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject(jwtConfig.KEY)
    config: ConfigType<typeof jwtConfig>,
    private readonly authService: AuthService,
  ) {
    // 确保 JWT secret 存在
    if (!config.secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从 Header 的 Bearer token 中提取
      ignoreExpiration: false, // 不忽略过期时间
      secretOrKey: config.secret, // JWT 密钥
    });
  }

  /**
   * 验证 JWT payload
   * Passport 会自动验证 token 签名和过期时间，
   * 此方法用于验证用户是否存在
   * @param payload JWT payload
   * @returns 用户信息（会被挂载到 request.user）
   */
  async validate(payload: JwtPayload): Promise<User> {
    const openid = payload.sub; // 从 JWT 标准字段 sub 中提取 openid

    if (!openid) {
      throw new UnauthorizedException('无效的token');
    }

    // 验证用户是否存在
    const user = await this.authService.validateUser(openid);

    return user; // 返回的用户信息会被挂载到 request.user
  }
}
