import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import unitelConfig from './config/unitel.config';
import { RedisModule } from '@/redis/redis.module';
import { LoggerModule } from '@/logger/logger.module';
import { UnitelApiService } from './services/unitel-api.service';

/**
 * Unitel API 模块
 * 纯粹的 Unitel 运营商 API 封装，无业务逻辑
 * 提供查询套餐、充值话费/流量/发票等接口调用
 */
@Module({
  imports: [
    // 注册 Unitel 配置
    ConfigModule.forFeature(unitelConfig),

    // HTTP 客户端（用于调用 Unitel API）
    HttpModule,

    // Redis 模块（用于 Token 缓存）
    RedisModule,

    // 日志模块
    LoggerModule,
  ],
  providers: [UnitelApiService],
  exports: [UnitelApiService],
})
export class UnitelApiModule {}
