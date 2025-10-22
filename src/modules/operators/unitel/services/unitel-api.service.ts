import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import unitelConfig from '../config/unitel.config';
import { RedisService } from '@/redis/redis.service';
import {
  TokenResponse,
  ServiceTypeResponse,
  InvoiceResponse,
  RechargeResponse,
  PaymentResponse,
  RechargeBalanceParams,
  RechargeDataParams,
  PayInvoiceParams,
} from '../interfaces';

/**
 * Unitel API 服务
 * 职责：封装 Unitel 第三方 API 调用
 * - Token 管理（被动刷新策略）
 * - HTTP 请求封装
 * - 401 自动重试
 */
@Injectable()
export class UnitelApiService {
  private readonly logger = new Logger(UnitelApiService.name);
  private readonly REDIS_TOKEN_KEY = 'unitel:access_token';

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    @Inject(unitelConfig.KEY)
    private readonly config: ConfigType<typeof unitelConfig>,
  ) {}

  // ========== Token 管理 ==========

  /**
   * 获取 Access Token（优先从 Redis 缓存）
   * 被动刷新策略：不设置 TTL，依赖 401 触发刷新
   */
  private async getAccessToken(): Promise<string> {
    // 1. 尝试从 Redis 获取缓存
    const cachedToken = await this.redisService.get(this.REDIS_TOKEN_KEY);
    if (cachedToken) {
      this.logger.debug('使用缓存的 Access Token');
      return cachedToken;
    }

    // 2. 无缓存，调用 /auth 获取新 Token
    this.logger.log('缓存中无 Token，正在获取新 Token...');
    const token = await this.fetchNewToken();

    // 3. 保存到 Redis（无 TTL，依赖被动刷新）
    await this.redisService.set(this.REDIS_TOKEN_KEY, token);
    this.logger.log('新 Token 已缓存到 Redis');

    return token;
  }

  /**
   * 调用 /auth 获取新 Token
   */
  private async fetchNewToken(): Promise<string> {
    try {
      // 构造 Basic Auth
      const auth = Buffer.from(
        `${this.config.username}:${this.config.password}`,
      ).toString('base64');

      this.logger.debug('正在调用 Unitel /auth 端点...');

      // 调用 /auth
      const response = await firstValueFrom(
        this.httpService.post<TokenResponse>(
          `${this.config.baseUrl}/auth`,
          null,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
            timeout: this.config.timeout,
          },
        ),
      );

      this.logger.log('成功获取 Access Token');
      return response.data.access_token;
    } catch (error) {
      this.logger.error('获取 Access Token 失败', error.message);
      throw new Error(`Unitel 认证失败: ${error.message}`);
    }
  }

  /**
   * 清除 Token 缓存（401 时调用）
   */
  private async clearTokenCache(): Promise<void> {
    await this.redisService.del(this.REDIS_TOKEN_KEY);
    this.logger.log('已清除过期的 Token 缓存');
  }

  // ========== HTTP 请求封装 ==========

  /**
   * 统一的 HTTP 请求方法
   * 自动处理 Token 和 401 重试
   *
   * @param method HTTP 方法
   * @param endpoint API 端点（相对路径）
   * @param data 请求体数据
   * @param retryOn401 是否在 401 时重试（防止无限循环）
   */
  private async request<T>(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
    retryOn401 = true,
  ): Promise<T> {
    try {
      // 1. 获取 Token
      const token = await this.getAccessToken();

      // 2. 发起请求
      this.logger.debug(`调用 Unitel API: ${method} ${endpoint}`);
      const response = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url: `${this.config.baseUrl}${endpoint}`,
          data,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: this.config.timeout,
        }),
      );

      this.logger.debug(`API 调用成功: ${endpoint}`);
      return response.data;
    } catch (error) {
      // 3. 处理 401 错误（Token 过期）
      if (error.response?.status === 401 && retryOn401) {
        this.logger.warn('Token 已过期（401），正在刷新并重试...');

        // 清除缓存
        await this.clearTokenCache();

        // 重试 1 次（retryOn401 = false 防止无限循环）
        return this.request<T>(method, endpoint, data, false);
      }

      // 4. 其他错误抛出
      this.logger.error(
        `Unitel API 调用失败: ${endpoint}`,
        error.response?.data || error.message,
      );

      throw new Error(
        `Unitel API 错误: ${error.response?.data?.msg || error.message}`,
      );
    }
  }

  // ========== 业务 API 方法 ==========

  /**
   * 获取资费列表
   * POST /service/servicetype
   *
   * @param msisdn 手机号
   * @returns 资费列表（包含话费和流量套餐）
   */
  async getServiceType(msisdn: string): Promise<ServiceTypeResponse> {
    return this.request<ServiceTypeResponse>('POST', '/service/servicetype', {
      msisdn,
      info: '1',
    });
  }

  /**
   * 获取后付费账单
   * POST /service/unitel
   *
   * @param msisdn 手机号
   * @returns 账单信息
   */
  async getInvoice(msisdn: string): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>('POST', '/service/unitel', {
      owner: msisdn,
      msisdn,
    });
  }

  /**
   * 充值话费
   * POST /service/recharge
   *
   * @param params 充值参数
   * @returns 充值结果（含 VAT 发票信息）
   */
  async rechargeBalance(
    params: RechargeBalanceParams,
  ): Promise<RechargeResponse> {
    return this.request<RechargeResponse>('POST', '/service/recharge', params);
  }

  /**
   * 充值流量
   * POST /service/datapackage
   *
   * @param params 充值参数
   * @returns 充值结果（含 VAT 发票信息）
   */
  async rechargeData(params: RechargeDataParams): Promise<RechargeResponse> {
    return this.request<RechargeResponse>(
      'POST',
      '/service/datapackage',
      params,
    );
  }

  /**
   * 支付后付费账单
   * POST /service/payment
   *
   * @param params 支付参数
   * @returns 支付结果
   */
  async payInvoice(params: PayInvoiceParams): Promise<PaymentResponse> {
    return this.request<PaymentResponse>('POST', '/service/payment', params);
  }
}
