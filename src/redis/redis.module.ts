import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import redisConfig from '@/redis/redis.config';
import { RedisService } from '@/redis/redis.service';

/**
 * Redis 模块（全局模块）
 * 所有模块都可以直接注入 RedisService 使用
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}
