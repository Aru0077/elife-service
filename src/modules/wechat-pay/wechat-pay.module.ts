import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import wechatPayConfig from './config/wechat-pay.config';
import { LoggerModule } from '@/logger/logger.module';
import { PaymentProcessorModule } from '@/modules/payment-processor/payment-processor.module';
import { WechatPayApiService } from './services/wechat-pay-api.service';
import { WechatPaySignatureService } from './services/wechat-pay-signature.service';
import { WechatPayCryptoService } from './services/wechat-pay-crypto.service';
import { WechatPayController } from './controllers/wechat-pay.controller';

/**
 * 微信支付模块
 * 提供微信支付JSAPI的完整功能封装
 */
@Module({
  imports: [
    // 注册微信支付配置
    ConfigModule.forFeature(wechatPayConfig),

    // HTTP 客户端（用于调用微信支付API）
    HttpModule,

    // 日志模块
    LoggerModule,

    // 支付处理器模块（用于处理回调和充值）
    PaymentProcessorModule,
  ],
  controllers: [WechatPayController],
  providers: [
    WechatPayApiService,
    WechatPaySignatureService,
    WechatPayCryptoService,
  ],
  exports: [
    WechatPayApiService,
    WechatPaySignatureService,
    WechatPayCryptoService,
  ], // 导出供其他模块使用
})
export class WechatPayModule {}
