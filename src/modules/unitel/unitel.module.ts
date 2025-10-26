import { Module } from '@nestjs/common';
import { PrismaModule } from '@/prisma/prisma.module';
import { ExchangeRateModule } from '@/modules/exchange-rate';
import { WechatPayApiModule } from '@/modules/api-services/wechat-pay-api';
import { UnitelApiModule } from '@/modules/api-services/unitel-api';
import { UnitelService } from './unitel.service';
import { UnitelController } from './unitel.controller';
import { LoggerModule } from '@/logger/logger.module';

/**
 * Unitel 订单模块
 * 负责 Unitel 运营商的订单业务逻辑
 * 包含订单CRUD、创建支付、执行充值等功能
 */
@Module({
  imports: [
    // Prisma 模块（用于数据库操作）
    PrismaModule,

    // 汇率模块（用于汇率转换）
    ExchangeRateModule,

    // 微信支付 API 模块（用于创建支付订单）
    WechatPayApiModule,

    // Unitel API 模块（用于查询套餐和充值）
    UnitelApiModule,

    // 日志模块（用于记录日志）
    LoggerModule,
  ],
  controllers: [UnitelController],
  providers: [UnitelService],
  exports: [UnitelService], // 导出供 PaymentFlowModule 使用
})
export class UnitelModule {}
