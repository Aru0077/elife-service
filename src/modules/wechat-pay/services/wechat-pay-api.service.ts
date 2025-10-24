import {
  Injectable,
  Inject,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PinoLogger } from 'nestjs-pino';
import { firstValueFrom } from 'rxjs';
import wechatPayConfig from '../config/wechat-pay.config';
import { WechatPaySignatureService } from './wechat-pay-signature.service';
import {
  CreateTransactionRequest,
  CreateTransactionResponse,
  QueryTransactionResponse,
  CloseTransactionRequest,
  CreateRefundRequest,
  CreateRefundResponse,
  QueryRefundResponse,
  WechatPayErrorResponse,
} from '../interfaces/wechat-pay.interface';

/**
 * 微信支付API服务
 * 封装所有微信支付APIv3调用
 */
@Injectable()
export class WechatPayApiService {
  constructor(
    @Inject(wechatPayConfig.KEY)
    private readonly config: ConfigType<typeof wechatPayConfig>,
    private readonly httpService: HttpService,
    private readonly signatureService: WechatPaySignatureService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(WechatPayApiService.name);
  }

  /**
   * 创建JSAPI支付订单
   * @param params 订单参数
   * @returns prepay_id（2小时有效期）
   */
  async createTransaction(
    params: Omit<CreateTransactionRequest, 'appid' | 'mchid' | 'notify_url'>,
  ): Promise<CreateTransactionResponse> {
    const url = '/v3/pay/transactions/jsapi';
    const method = 'POST';

    // 构造完整请求体
    const body: CreateTransactionRequest = {
      appid: this.config.appid,
      mchid: this.config.mchid,
      notify_url: this.config.notifyUrl,
      ...params,
    };

    this.logger.info(
      `创建JSAPI支付订单: ${body.out_trade_no}, 金额: ${body.amount.total}分`,
    );

    try {
      const response = await this.request<CreateTransactionResponse>(
        method,
        url,
        body,
      );

      this.logger.info(
        `支付订单创建成功: ${body.out_trade_no}, prepay_id: ${response.prepay_id}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`创建支付订单失败: ${body.out_trade_no}`, error);
      throw error;
    }
  }

  /**
   * 查询订单（通过商户订单号）
   * @param outTradeNo 商户订单号
   * @returns 订单详情
   */
  async queryTransactionByOutTradeNo(
    outTradeNo: string,
  ): Promise<QueryTransactionResponse> {
    const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}`;
    const method = 'GET';

    this.logger.info(`查询订单: ${outTradeNo}`);

    try {
      const response = await this.request<QueryTransactionResponse>(
        method,
        `${url}?mchid=${this.config.mchid}`,
        null,
      );

      this.logger.info(
        `订单查询成功: ${outTradeNo}, 状态: ${response.trade_state}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`查询订单失败: ${outTradeNo}`, error);
      throw error;
    }
  }

  /**
   * 查询订单（通过微信支付订单号）
   * @param transactionId 微信支付订单号
   * @returns 订单详情
   */
  async queryTransactionById(
    transactionId: string,
  ): Promise<QueryTransactionResponse> {
    const url = `/v3/pay/transactions/id/${transactionId}`;
    const method = 'GET';

    this.logger.info(`查询订单: ${transactionId}`);

    try {
      const response = await this.request<QueryTransactionResponse>(
        method,
        `${url}?mchid=${this.config.mchid}`,
        null,
      );

      this.logger.info(
        `订单查询成功: ${transactionId}, 状态: ${response.trade_state}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`查询订单失败: ${transactionId}`, error);
      throw error;
    }
  }

  /**
   * 关闭订单
   * @param outTradeNo 商户订单号
   */
  async closeTransaction(outTradeNo: string): Promise<void> {
    const url = `/v3/pay/transactions/out-trade-no/${outTradeNo}/close`;
    const method = 'POST';

    const body: CloseTransactionRequest = {
      mchid: this.config.mchid,
    };

    this.logger.info(`关闭订单: ${outTradeNo}`);

    try {
      await this.request<void>(method, url, body);
      this.logger.info(`订单已关闭: ${outTradeNo}`);
    } catch (error) {
      this.logger.error(`关闭订单失败: ${outTradeNo}`, error);
      throw error;
    }
  }

  /**
   * 申请退款
   * @param params 退款参数
   * @returns 退款结果
   */
  async createRefund(
    params: CreateRefundRequest,
  ): Promise<CreateRefundResponse> {
    const url = '/v3/refund/domestic/refunds';
    const method = 'POST';

    // 如果没有指定退款回调URL，使用支付回调URL
    const body: CreateRefundRequest = {
      ...params,
      notify_url: params.notify_url || this.config.refundNotifyUrl,
    };

    this.logger.info(
      `申请退款: ${body.out_refund_no}, 金额: ${body.amount.refund}分`,
    );

    try {
      const response = await this.request<CreateRefundResponse>(
        method,
        url,
        body,
      );

      this.logger.info(
        `退款申请成功: ${body.out_refund_no}, refund_id: ${response.refund_id}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`申请退款失败: ${body.out_refund_no}`, error);
      throw error;
    }
  }

  /**
   * 查询退款（通过商户退款单号）
   * @param outRefundNo 商户退款单号
   * @returns 退款详情
   */
  async queryRefund(outRefundNo: string): Promise<QueryRefundResponse> {
    const url = `/v3/refund/domestic/refunds/${outRefundNo}`;
    const method = 'GET';

    this.logger.info(`查询退款: ${outRefundNo}`);

    try {
      const response = await this.request<QueryRefundResponse>(
        method,
        url,
        null,
      );

      this.logger.info(
        `退款查询成功: ${outRefundNo}, 状态: ${response.status}`,
      );

      return response;
    } catch (error) {
      this.logger.error(`查询退款失败: ${outRefundNo}`, error);
      throw error;
    }
  }

  /**
   * 通用HTTP请求方法
   * @param method HTTP方法
   * @param url 请求URL路径
   * @param data 请求体（GET请求传null）
   * @returns 响应数据
   */
  private async request<T>(
    method: string,
    url: string,
    data: unknown,
  ): Promise<T> {
    // 1. 生成随机串和时间戳
    const nonce = this.signatureService.generateNonce();
    const timestamp = this.signatureService.getTimestamp();

    // 2. 准备请求体
    const body = data ? JSON.stringify(data) : '';

    // 3. 生成签名
    const authorization = this.signatureService.generateAuthorizationHeader(
      method,
      url,
      timestamp,
      nonce,
      body,
    );

    // 4. 构造请求头
    const headers = {
      Authorization: authorization,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'elife-service/1.0.0',
    };

    // 5. 发送请求
    const fullUrl = `${this.config.apiBaseUrl}${url}`;

    try {
      const response = await firstValueFrom(
        this.httpService.request<T | WechatPayErrorResponse>({
          method,
          url: fullUrl,
          headers,
          data: body || undefined,
          timeout: this.config.timeout,
        }),
      );

      // 6. 检查是否为错误响应
      const responseData = response.data;
      if (
        responseData &&
        typeof responseData === 'object' &&
        'code' in responseData
      ) {
        const errorResponse = responseData;
        throw new BadRequestException(
          `微信支付API错误: ${errorResponse.code} - ${errorResponse.message}`,
        );
      }

      return responseData;
    } catch (error) {
      // 如果是已经抛出的BadRequestException，直接传递
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      // 其他错误统一处理
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.logger.error(`微信支付API请求失败: ${method} ${url}`, error);
      throw new InternalServerErrorException(
        `微信支付服务暂时不可用: ${errorMessage}`,
      );
    }
  }
}
