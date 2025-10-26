import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import wechatPayConfig from './config/wechat-pay.config';
import { LoggerModule } from '@/logger/logger.module';
import { WechatPayApiService } from './services/wechat-pay-api.service';
import { WechatPaySignatureService } from './services/wechat-pay-signature.service';
import { WechatPayCryptoService } from './services/wechat-pay-crypto.service';

/**
 * 微信支付 API 模块
 * 纯粹的微信支付 API 封装，无业务逻辑
 * 提供支付接口调用、签名验证、数据加解密服务
 */
@Module({
  imports: [
    // 注册微信支付配置
    ConfigModule.forFeature(wechatPayConfig),

    // HTTP 客户端（用于调用微信支付API）
    HttpModule,

    // 日志模块
    LoggerModule,
  ],
  providers: [
    WechatPayApiService,
    WechatPaySignatureService,
    WechatPayCryptoService,
  ],
  exports: [
    WechatPayApiService,
    WechatPaySignatureService,
    WechatPayCryptoService,
  ],
})
export class WechatPayApiModule {}
