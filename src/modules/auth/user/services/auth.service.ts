import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { WechatApiService } from './wechat-api.service';
import { JwtPayload } from '../interfaces/wechat-auth.interface';
import { User } from '@prisma/client';

/**
 * 认证服务
 * 处理用户登录、JWT生成、用户验证等业务逻辑
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly wechatApiService: WechatApiService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 微信授权登录
   * @param code 微信授权码
   * @returns JWT token 和用户信息
   */
  async wechatLogin(code: string): Promise<{
    access_token: string;
    openid: string;
    expiresIn: string;
  }> {
    // 1. 通过 code 换取 openid
    this.logger.log('开始微信授权登录流程');
    const wechatAuth = await this.wechatApiService.getAccessTokenByCode(code);
    const { openid } = wechatAuth;

    // 2. 查询或创建用户
    const user = await this.findOrCreateUser(openid);

    // 3. 生成 JWT token
    const payload: JwtPayload = {
      sub: openid,
      openid: openid,
    };

    const access_token = this.jwtService.sign(payload);

    this.logger.log(`用户 ${openid} 登录成功`);

    return {
      access_token,
      openid: user.openid,
      expiresIn: '7d', // 从配置中获取
    };
  }

  /**
   * 查询或创建用户
   * @param openid 微信openid
   * @returns 用户信息
   */
  private async findOrCreateUser(openid: string): Promise<User> {
    this.logger.log(`查询或创建用户: ${openid}`);

    const user = await this.prisma.user.upsert({
      where: { openid },
      update: {
        updatedAt: new Date(), // 更新最后登录时间
      },
      create: {
        openid,
      },
    });

    if (user.createdAt.getTime() === user.updatedAt.getTime()) {
      this.logger.log(`新用户注册: ${openid}`);
    } else {
      this.logger.log(`已有用户登录: ${openid}`);
    }

    return user;
  }

  /**
   * 验证用户（用于 JWT 策略）
   * @param openid 用户openid
   * @returns 用户信息
   */
  async validateUser(openid: string): Promise<User> {
    this.logger.log(`验证用户: ${openid}`);

    const user = await this.prisma.user.findUnique({
      where: { openid },
    });

    if (!user) {
      this.logger.warn(`用户不存在: ${openid}`);
      throw new UnauthorizedException('用户不存在');
    }

    return user;
  }

  /**
   * 获取用户信息
   * @param openid 用户openid
   * @returns 用户信息
   */
  async getUserProfile(openid: string): Promise<User> {
    return this.validateUser(openid);
  }
}
