import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigType } from '@nestjs/config';
import { AxiosError, AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import { PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import unitelConfig, { UNITEL_ENDPOINTS } from '../config/unitel.config';
import { RedisService } from '@/redis/redis.service';
import { ThirdPartyLoggerService } from '@/logger/services/third-party-logger.service';
import {
  TokenResponse,
  ServiceTypeResponse,
  InvoiceResponse,
  RechargeResponse,
  PaymentResponse,
  RechargeBalanceParams,
  RechargeDataParams,
  PayInvoiceParams,
  CardItem,
  UnitelErrorResponse,
} from '../interfaces';
import { PackageDetail } from '../interfaces/order.interface';
import { OrderType } from '@prisma/client';
import { UnitelCacheType } from '../enums';
import { UnitelApiException } from '../errors/unitel-api.exception';

function isUnitelErrorResponsePayload(
  body: unknown,
): body is UnitelErrorResponse {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const candidate = body as Partial<UnitelErrorResponse>;
  return (
    'result' in candidate &&
    'msg' in candidate &&
    typeof candidate.result === 'string' &&
    typeof candidate.msg === 'string'
  );
}
/**
 * Unitel API 服务
 * 职责：封装 Unitel 第三方 API 调用
 * - Token 管理（被动刷新策略）
 * - HTTP 请求封装
 * - 401 自动重试
 * - 完整的第三方 API 日志记录
 */
@Injectable()
export class UnitelApiService {
  private readonly REDIS_TOKEN_KEY = 'unitel:access_token';
  private readonly CACHE_TTL = 180; // 3分钟（秒）

  constructor(
    private readonly httpService: HttpService,
    private readonly redisService: RedisService,
    private readonly logger: PinoLogger,
    private readonly thirdPartyLogger: ThirdPartyLoggerService,
    @Inject(unitelConfig.KEY)
    private readonly config: ConfigType<typeof unitelConfig>,
  ) {
    this.logger.setContext(UnitelApiService.name);
  }

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
    this.logger.info('缓存中无 Token，正在获取新 Token...');
    const token = await this.fetchNewToken();

    // 3. 保存到 Redis（TTL: 1小时，提供双重保护）
    await this.redisService.set(this.REDIS_TOKEN_KEY, token, 3600);
    this.logger.info('新 Token 已缓存到 Redis (TTL: 3600秒)');

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
          `${this.config.baseUrl}${UNITEL_ENDPOINTS.AUTH}`,
          null,
          {
            headers: {
              Authorization: `Basic ${auth}`,
            },
            timeout: this.config.timeout,
          },
        ),
      );

      this.logger.info('成功获取 Access Token');
      return response.data.access_token;
    } catch (error) {
      const errorMessage =
        error instanceof AxiosError ? error.message : '未知错误';
      this.logger.error('获取 Access Token 失败', errorMessage);
      throw new Error(`Unitel 认证失败: ${errorMessage}`);
    }
  }

  /**
   * 清除 Token 缓存（401 时调用）
   */
  private async clearTokenCache(): Promise<void> {
    await this.redisService.del(this.REDIS_TOKEN_KEY);
    this.logger.info('已清除过期的 Token 缓存');
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
    const traceId = randomUUID();
    const url = `${this.config.baseUrl}${endpoint}`;
    const startTime = Date.now();

    try {
      // 1. 获取 Token
      const token = await this.getAccessToken();

      // 2. 发起请求
      this.logger.debug(`[${traceId}] 调用 Unitel API: ${method} ${endpoint}`);
      const response: AxiosResponse<T> = await firstValueFrom(
        this.httpService.request<T>({
          method,
          url,
          data: data as Record<string, unknown>,
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          timeout: this.config.timeout,
        }),
      );

      // 3. 记录成功日志
      const duration = Date.now() - startTime;
      this.thirdPartyLogger.logApiSuccess({
        traceId,
        service: 'Unitel',
        method,
        url,
        requestHeaders: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ***REDACTED***',
        },
        requestBody: data,
        responseStatus: response.status,
        responseHeaders: response.headers as Record<string, string>,
        responseBody: response.data,
        duration,
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(
        `[${traceId}] API 调用成功: ${endpoint} (${duration}ms)`,
      );
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;

      // 3. 处理 401 错误（Token 过期）
      if (
        error instanceof AxiosError &&
        error.response?.status === 401 &&
        retryOn401
      ) {
        this.logger.warn(`[${traceId}] Token 已过期（401），正在刷新并重试...`);

        // 清除缓存
        await this.clearTokenCache();

        // 重试 1 次（retryOn401 = false 防止无限循环）
        return this.request<T>(method, endpoint, data, false);
      }

      // 4. 记录错误日志
      const isAxiosError = error instanceof AxiosError;
      const responseBody: unknown = isAxiosError
        ? error.response?.data
        : undefined;
      const statusCode = isAxiosError ? error.response?.status : undefined;
      const unitelError = isUnitelErrorResponsePayload(responseBody)
        ? responseBody
        : undefined;
      const originalErrorDetails = isAxiosError
        ? {
            message: error.message,
            code: error.code,
            status: statusCode,
          }
        : error instanceof Error
          ? { message: error.message, stack: error.stack }
          : { message: String(error) };

      const errorMsg: string = isAxiosError
        ? unitelError?.msg || error.message
        : String(error);

      this.thirdPartyLogger.logApiError({
        traceId,
        service: 'Unitel',
        method,
        url,
        requestHeaders: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ***REDACTED***',
        },
        requestBody: data,
        responseStatus: statusCode,
        responseBody,
        duration,
        error: errorMsg,
        timestamp: new Date().toISOString(),
      });

      this.logger.error(
        `[${traceId}] Unitel API 调用失败: ${endpoint}`,
        errorMsg,
      );

      throw new UnitelApiException({
        traceId,
        statusCode,
        unitelResult: unitelError?.result,
        unitelCode: unitelError?.code,
        unitelMsg: unitelError?.msg || errorMsg,
        originalError: originalErrorDetails,
      });
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
    return this.request<ServiceTypeResponse>(
      'POST',
      UNITEL_ENDPOINTS.SERVICE_TYPE,
      {
        msisdn,
        info: '1',
      },
    );
  }

  /**
   * 获取后付费账单
   * POST /service/unitel
   *
   * @param msisdn 手机号
   * @returns 账单信息
   */
  async getInvoice(msisdn: string): Promise<InvoiceResponse> {
    return this.request<InvoiceResponse>('POST', UNITEL_ENDPOINTS.INVOICE, {
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
    return this.request<RechargeResponse>(
      'POST',
      UNITEL_ENDPOINTS.RECHARGE,
      params,
    );
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
      UNITEL_ENDPOINTS.DATA_PACKAGE,
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
    return this.request<PaymentResponse>(
      'POST',
      UNITEL_ENDPOINTS.PAYMENT,
      params,
    );
  }

  // ========== 缓存层方法（安全价格验证） ==========

  /**
   * 生成缓存键
   * @param cacheType 缓存类型
   * @param openid 用户openid
   * @param msisdn 手机号
   * @returns 缓存键
   * @private
   */
  private buildCacheKey(
    cacheType: UnitelCacheType,
    openid: string,
    msisdn: string,
  ): string {
    return `unitel:${cacheType}:${openid}:${msisdn}`;
  }

  /**
   * 通用缓存方法
   * 统一处理所有类型的缓存逻辑
   *
   * @param cacheType 缓存类型
   * @param msisdn 手机号
   * @param openid 用户openid
   * @param apiFetcher API调用函数
   * @param dataDescription 数据描述（用于日志）
   * @returns 缓存或API返回的数据
   * @private
   */
  private async getCachedData<T>(
    cacheType: UnitelCacheType,
    msisdn: string,
    openid: string,
    apiFetcher: () => Promise<T>,
    dataDescription: string,
  ): Promise<T> {
    // 1. 生成缓存键
    const cacheKey = this.buildCacheKey(cacheType, openid, msisdn);

    // 2. 尝试从缓存获取
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(`使用缓存的${dataDescription}: ${cacheKey}`);
      return JSON.parse(cached) as T;
    }

    // 3. 缓存miss，调用API获取
    this.logger.info(`缓存miss，正在从第三方获取${dataDescription}: ${msisdn}`);
    const data = await apiFetcher();

    // 4. 保存到Redis（3分钟TTL）
    await this.redisService.set(cacheKey, JSON.stringify(data), this.CACHE_TTL);
    this.logger.info(
      `${dataDescription}已缓存: ${cacheKey} (TTL: ${this.CACHE_TTL}s)`,
    );

    return data;
  }

  /**
   * 获取缓存的资费列表（3分钟TTL）
   * 用于防止价格篡改和减轻第三方API压力
   *
   * @param msisdn 手机号
   * @param openid 用户openid
   * @returns 资费列表
   */
  async getCachedServiceTypes(
    msisdn: string,
    openid: string,
  ): Promise<ServiceTypeResponse> {
    return this.getCachedData(
      UnitelCacheType.SERVICE_TYPES,
      msisdn,
      openid,
      () => this.getServiceType(msisdn),
      '资费列表',
    );
  }

  /**
   * 获取缓存的账单信息（3分钟TTL）
   *
   * @param msisdn 手机号
   * @param openid 用户openid
   * @returns 账单信息
   */
  async getCachedInvoice(
    msisdn: string,
    openid: string,
  ): Promise<InvoiceResponse> {
    return this.getCachedData(
      UnitelCacheType.INVOICE,
      msisdn,
      openid,
      () => this.getInvoice(msisdn),
      '账单信息',
    );
  }

  /**
   * 根据packageCode查找套餐详情（核心方法）
   * 用于创建订单时的价格验证
   *
   * @param params 查询参数
   * @returns 套餐详情（包含实时价格）
   * @throws NotFoundException 套餐不存在时抛出
   */
  async findPackageByCode(params: {
    packageCode: string;
    msisdn: string;
    openid: string;
    orderType: OrderType;
  }): Promise<PackageDetail> {
    const { packageCode, msisdn, openid, orderType } = params;

    // 1. 根据订单类型查询不同数据源
    if (orderType === 'invoice_payment') {
      // 账单支付：从账单信息中获取
      return this.findInvoicePackage(packageCode, msisdn, openid);
    } else {
      // 话费/流量充值：从资费列表中查找
      return this.findServicePackage(packageCode, msisdn, openid, orderType);
    }
  }

  /**
   * 从账单信息中查找套餐详情
   * @private
   */
  private async findInvoicePackage(
    invoiceDate: string,
    msisdn: string,
    openid: string,
  ): Promise<PackageDetail> {
    const invoice = await this.getCachedInvoice(msisdn, openid);

    // 验证账单日期是否匹配
    if (invoice.invoice_date !== invoiceDate) {
      throw new NotFoundException(
        `账单日期不匹配，当前账单期为: ${invoice.invoice_date}`,
      );
    }

    // 构造账单套餐详情
    return {
      code: invoiceDate,
      name: `账单支付 ${invoiceDate}`,
      engName: `Invoice Payment ${invoiceDate}`,
      price: invoice.total_unpaid, // 使用总未付金额
      type: 'invoice',
    };
  }

  /**
   * 从资费列表中查找套餐详情
   * @private
   */
  private async findServicePackage(
    packageCode: string,
    msisdn: string,
    openid: string,
    orderType: OrderType,
  ): Promise<PackageDetail> {
    const serviceTypes = await this.getCachedServiceTypes(msisdn, openid);

    let foundCard: CardItem | undefined;
    let packageType: 'balance' | 'data' | undefined;

    // 2. 根据订单类型在不同分类中查找
    if (orderType === 'balance') {
      // 话费充值：在 service.cards 中查找
      const allBalanceCards = [
        ...(serviceTypes.service.cards.day || []),
        ...(serviceTypes.service.cards.noday || []),
        ...(serviceTypes.service.cards.special || []),
      ];
      foundCard = allBalanceCards.find((card) => card.code === packageCode);
      packageType = 'balance';
    } else if (orderType === 'data') {
      // 流量充值：在 service.data 中查找
      const allDataCards = [
        ...(serviceTypes.service.data.data || []),
        ...(serviceTypes.service.data.days || []),
        ...(serviceTypes.service.data.entertainment || []),
      ];
      foundCard = allDataCards.find((card) => card.code === packageCode);
      packageType = 'data';
    }

    // 3. 未找到套餐
    if (!foundCard || !packageType) {
      throw new NotFoundException(
        `套餐不存在或已下架: ${packageCode} (类型: ${orderType})`,
      );
    }

    // 4. 构造套餐详情
    return {
      code: foundCard.code,
      name: foundCard.name,
      engName: foundCard.eng_name,
      price: foundCard.price,
      type: packageType,
      unit: foundCard.unit,
      data: foundCard.data,
      days: foundCard.days,
    };
  }
}
