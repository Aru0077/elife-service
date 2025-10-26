import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from '@/logger/logger.module';
import { UnitelModule } from '@/modules/operators/unitel/unitel.module';
import { RECHARGE_QUEUE } from './constants/queue.constants';
import { PaymentCallbackService } from './services/payment-callback.service';
import { RechargeLogService } from './services/recharge-log.service';
import { RechargeProcessor } from './processors/recharge.processor';

/**
 * 支付处理器模块
 * 负责处理微信支付回调和充值业务的异步处理
 */
@Module({
  imports: [
    // 注册BullMQ队列
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          password: configService.get<string>('redis.password'),
          db: configService.get<number>('redis.db'),
        },
      }),
      inject: [ConfigService],
    }),

    // 注册充值队列
    BullModule.registerQueue({
      name: RECHARGE_QUEUE,
      defaultJobOptions: {
        attempts: 1, // 不重试，失败直接标记
        removeOnComplete: false, // 保留成功的任务记录
        removeOnFail: false, // 保留失败的任务记录
      },
    }),

    LoggerModule,

    // 导入运营商模块（用于执行充值）
    forwardRef(() => UnitelModule),
  ],
  providers: [PaymentCallbackService, RechargeLogService, RechargeProcessor],
  exports: [PaymentCallbackService, RechargeLogService],
})
export class PaymentProcessorModule {}
