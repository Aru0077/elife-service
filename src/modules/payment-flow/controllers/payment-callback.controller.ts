import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import {
  WechatPaySignatureService,
  WechatPayCryptoService,
  PaymentCallbackHeaders,
  PaymentCallbackBody,
  PaymentCallbackResource,
  RefundCallbackResource,
  TransactionState,
} from '@/modules/api-services/wechat-pay-api';
import { PaymentCallbackService } from '../services/payment-callback.service';

/**
 * 支付回调控制器
 * 处理微信支付和退款的异步通知
 */
@Controller('payment/wechat')
export class PaymentCallbackController {
  constructor(
    private readonly signatureService: WechatPaySignatureService,
    private readonly cryptoService: WechatPayCryptoService,
    private readonly paymentCallbackService: PaymentCallbackService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(PaymentCallbackController.name);
  }

  /**
   * 支付结果回调通知
   * POST /payment/wechat/notify
   *
   * @param headers 回调请求头（包含签名信息）
   * @param body 回调请求体（加密数据）
   * @returns 成功响应（必须在5秒内返回）
   */
  @Post('notify')
  @HttpCode(HttpStatus.NO_CONTENT) // 返回204 No Content
  async handlePaymentCallback(
    @Headers() headers: PaymentCallbackHeaders,
    @Body() body: PaymentCallbackBody,
  ): Promise<void> {
    this.logger.info(
      `收到微信支付回调通知: ${body.id}, 事件类型: ${body.event_type}`,
    );

    try {
      // 1. 验证签名
      const bodyString = JSON.stringify(body);
      const isValid = this.signatureService.verifyCallbackSignature(
        headers,
        bodyString,
      );

      if (!isValid) {
        this.logger.error('微信支付回调签名验证失败');
        throw new BadRequestException('签名验证失败');
      }

      // 2. 解密数据
      const decryptedData = this.cryptoService.decryptAesGcm(
        body.resource.ciphertext,
        body.resource.nonce,
        body.resource.associated_data,
      );

      const paymentData = JSON.parse(decryptedData) as PaymentCallbackResource;

      this.logger.info(
        `支付回调解密成功: 订单号=${paymentData.out_trade_no}, 状态=${paymentData.trade_state}`,
      );

      // 3. 处理支付结果
      if (paymentData.trade_state === TransactionState.SUCCESS) {
        await this.paymentCallbackService.handlePaymentSuccess(
          paymentData.transaction_id,
          paymentData.out_trade_no,
        );
        this.logger.info(
          `支付回调处理成功: 订单号=${paymentData.out_trade_no}`,
        );
      } else {
        this.logger.warn(
          `支付未成功: 订单号=${paymentData.out_trade_no}, 状态=${paymentData.trade_state}`,
        );
      }

      // 4. 返回成功（204 No Content）
      // 微信收到此响应后不会再发送通知
      return;
    } catch (error) {
      this.logger.error('处理支付回调失败', error);
      throw error;
    }
  }

  /**
   * 退款结果回调通知
   * POST /payment/wechat/refund-notify
   *
   * @param headers 回调请求头（包含签名信息）
   * @param body 回调请求体（加密数据）
   * @returns 成功响应（必须在5秒内返回）
   */
  @Post('refund-notify')
  @HttpCode(HttpStatus.NO_CONTENT) // 返回204 No Content
  handleRefundCallback(
    @Headers() headers: PaymentCallbackHeaders,
    @Body() body: PaymentCallbackBody,
  ): void {
    this.logger.info(
      `收到微信退款回调通知: ${body.id}, 事件类型: ${body.event_type}`,
    );

    try {
      // 1. 验证签名
      const bodyString = JSON.stringify(body);
      const isValid = this.signatureService.verifyCallbackSignature(
        headers,
        bodyString,
      );

      if (!isValid) {
        this.logger.error('微信退款回调签名验证失败');
        throw new BadRequestException('签名验证失败');
      }

      // 2. 解密数据
      const decryptedData = this.cryptoService.decryptAesGcm(
        body.resource.ciphertext,
        body.resource.nonce,
        body.resource.associated_data,
      );

      const refundData = JSON.parse(decryptedData) as RefundCallbackResource;

      this.logger.info(
        `退款回调解密成功: 退款单号=${refundData.out_refund_no}, 状态=${refundData.refund_status}`,
      );

      // 3. 处理退款结果
      // 注意: 当前项目不做退款业务，仅记录退款回调日志
      this.logger.info(
        `退款回调处理完成: 退款单号=${refundData.out_refund_no}`,
      );

      // 4. 返回成功（204 No Content）
      return;
    } catch (error) {
      this.logger.error('处理退款回调失败', error);
      throw error;
    }
  }
}
