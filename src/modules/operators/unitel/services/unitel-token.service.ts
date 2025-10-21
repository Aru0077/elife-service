import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { RedisService } from '../../../../redis/redis.service';
import { UNITEL_ENDPOINTS } from '../config/unitel.config';
import { UnitelTokenDto } from '../dto';

/**
 * Unitel Token 管理服务
 * 职责：从 Redis 获取/存储 Token，仅在 401 错误时重新获取
 */
@Injectable()
export class UnitelTokenService {
  private readonly logger = new Logger(UnitelTokenService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取有效的 Token
   * 优先从 Redis 获取，不存在时调用 API 获取
   */
  async getToken(): Promise<string> {
    const tokenKey =
      this.configService.get<string>('unitel.tokenKey') ||
      'unitel:access_token';

    // 1. 尝试从 Redis 获取
    const cachedToken = await this.redis.get(tokenKey);
    if (cachedToken) {
      this.logger.debug('从 Redis 获取到缓存的 Token');
      return cachedToken;
    }

    // 2. Redis 中没有，调用 API 获取
    this.logger.debug('Redis 中无 Token，调用 API 获取新 Token');
    return this.fetchAndCacheToken();
  }

  /**
   * 清除 Token（当收到 401 错误时调用）
   */
  async clearToken(): Promise<void> {
    const tokenKey =
      this.configService.get<string>('unitel.tokenKey') ||
      'unitel:access_token';
    await this.redis.del(tokenKey);
    this.logger.warn('已清除 Redis 中的 Token');
  }

  /**
   * 从 Unitel API 获取 Token 并缓存到 Redis
   * @private
   */
  private async fetchAndCacheToken(): Promise<string> {
    const username = this.configService.get<string>('unitel.username');
    const password = this.configService.get<string>('unitel.password');
    const baseUrl = this.configService.get<string>('unitel.baseUrl');
    const tokenKey =
      this.configService.get<string>('unitel.tokenKey') ||
      'unitel:access_token';
    const tokenTTL = this.configService.get<number>('unitel.tokenTTL') || 3600;

    // 生成 Basic Auth
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    const url = `${baseUrl}${UNITEL_ENDPOINTS.AUTH}`;

    try {
      const response = await firstValueFrom(
        this.httpService.post<UnitelTokenDto>(
          url,
          {}, // 空 body
          {
            headers: {
              Authorization: `Basic ${basicAuth}`,
            },
            timeout: this.configService.get('unitel.timeout'),
          },
        ),
      );

      const token = response.data.access_token;

      // 缓存到 Redis
      await this.redis.set(tokenKey, token, tokenTTL);
      this.logger.log(`新 Token 已缓存到 Redis，TTL: ${tokenTTL}秒`);

      return token;
    } catch (error: any) {
      this.logger.error('获取 Unitel Token 失败', error.message);
      throw new HttpException('Unitel API 认证失败', HttpStatus.UNAUTHORIZED);
    }
  }
}
