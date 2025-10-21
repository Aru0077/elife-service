import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { UNITEL_ENDPOINTS } from '../config/unitel.config';
import { UnitelTokenService } from './unitel-token.service';
import {
  GetServiceTypeRequestDto,
  ServiceTypeResponseDto,
  GetInvoiceRequestDto,
  InvoiceResponseDto,
  RechargeBalanceRequestDto,
  RechargeBalanceResponseDto,
  RechargeDataRequestDto,
  RechargeDataResponseDto,
  PayInvoiceRequestDto,
  PayInvoiceResponseDto,
} from '../dto';
import { UnitelResponseCode } from '../enums/unitel.enum';

/**
 * Unitel API 服务
 * 提供所有 Unitel API 调用方法
 */
@Injectable()
export class UnitelApiService {
  private readonly logger = new Logger(UnitelApiService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly tokenService: UnitelTokenService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 获取资费列表
   * 返回完整的话费和流量套餐信息
   */
  async getServiceType(
    dto: GetServiceTypeRequestDto,
  ): Promise<ServiceTypeResponseDto> {
    const response = await this.request<ServiceTypeResponseDto>(
      UNITEL_ENDPOINTS.SERVICE_TYPE,
      dto,
    );

    this.logger.debug(
      `获取资费列表成功 - MSISDN: ${dto.msisdn}, 类型: ${response.servicetype}`,
    );

    return response;
  }

  /**
   * 获取后付费账单
   * 所有号码都可调用，预付费号码部分字段可能为空
   */
  async getInvoice(dto: GetInvoiceRequestDto): Promise<InvoiceResponseDto> {
    const response = await this.request<InvoiceResponseDto>(
      UNITEL_ENDPOINTS.INVOICE,
      dto,
    );

    this.logger.debug(
      `获取账单成功 - MSISDN: ${dto.msisdn}, 状态: ${response.invoice_status}`,
    );

    return response;
  }

  /**
   * 充值话费
   * 返回包含完整 VAT 发票信息的响应
   */
  async rechargeBalance(
    dto: RechargeBalanceRequestDto,
  ): Promise<RechargeBalanceResponseDto> {
    const response = await this.request<RechargeBalanceResponseDto>(
      UNITEL_ENDPOINTS.RECHARGE,
      dto,
    );

    this.logger.log(
      `充值话费成功 - MSISDN: ${dto.msisdn}, 套餐: ${dto.card}, SV_ID: ${response.sv_id}`,
    );

    return response;
  }

  /**
   * 充值流量
   * 返回包含完整 VAT 发票信息的响应
   */
  async rechargeData(
    dto: RechargeDataRequestDto,
  ): Promise<RechargeDataResponseDto> {
    const response = await this.request<RechargeDataResponseDto>(
      UNITEL_ENDPOINTS.DATA_PACKAGE,
      dto,
    );

    this.logger.log(
      `充值流量成功 - MSISDN: ${dto.msisdn}, 套餐: ${dto.package}, SEQ: ${response.seq}`,
    );

    return response;
  }

  /**
   * 支付后付费账单
   * 注意：响应格式未知
   */
  async payInvoice(dto: PayInvoiceRequestDto): Promise<PayInvoiceResponseDto> {
    const response = await this.request<PayInvoiceResponseDto>(
      UNITEL_ENDPOINTS.PAYMENT,
      dto,
    );

    this.logger.log(
      `支付账单成功 - MSISDN: ${dto.msisdn}, 金额: ${dto.amount}`,
    );

    return response;
  }

  /**
   * 统一的 API 请求方法
   * 自动处理 401 错误和 Token 刷新
   * @private
   */
  private async request<T>(
    endpoint: string,
    data: any,
    retryCount = 0,
  ): Promise<T> {
    const username = this.configService.get<string>('unitel.username');
    const password = this.configService.get<string>('unitel.password');
    const baseUrl = this.configService.get<string>('unitel.baseUrl');
    const timeout = this.configService.get<number>('unitel.timeout');
    const maxRetries =
      this.configService.get<number>('unitel.retryAttempts') || 3;

    // 生成 Basic Auth
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    const url = `${baseUrl}${endpoint}`;

    try {
      const response = await firstValueFrom(
        this.httpService
          .post<T>(url, data, {
            headers: {
              Authorization: `Basic ${basicAuth}`,
            },
            timeout,
          })
          .pipe(
            catchError((error: AxiosError) => {
              throw error;
            }),
          ),
      );

      // 检查响应体中的 result 字段是否为 401
      const responseData = response.data as any;
      if (
        responseData.result === UnitelResponseCode.UNAUTHORIZED &&
        retryCount < maxRetries
      ) {
        this.logger.warn('响应返回 401，清除 Token 并重试...');
        await this.tokenService.clearToken();
        return this.request<T>(endpoint, data, retryCount + 1);
      }

      return response.data;
    } catch (error: any) {
      // 处理 HTTP 401 错误
      if (error.response?.status === 401 && retryCount < maxRetries) {
        this.logger.warn('HTTP 401 错误，清除 Token 并重试...');
        await this.tokenService.clearToken();
        return this.request<T>(endpoint, data, retryCount + 1);
      }

      // 其他错误
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 统一错误处理
   * @private
   */
  private handleError(error: any): void {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      this.logger.error(`Unitel API 错误: ${status} - ${JSON.stringify(data)}`);

      if (status === 401) {
        throw new HttpException('Unitel API 未授权', HttpStatus.UNAUTHORIZED);
      } else if (status >= 500) {
        throw new HttpException(
          'Unitel API 服务不可用',
          HttpStatus.SERVICE_UNAVAILABLE,
        );
      } else {
        throw new HttpException(
          data?.msg || 'Unitel API 请求失败',
          HttpStatus.BAD_REQUEST,
        );
      }
    } else if (error.code === 'ECONNABORTED') {
      this.logger.error('请求超时');
      throw new HttpException('请求超时', HttpStatus.REQUEST_TIMEOUT);
    } else {
      this.logger.error('未知错误', error);
      throw new HttpException(
        '内部服务器错误',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
