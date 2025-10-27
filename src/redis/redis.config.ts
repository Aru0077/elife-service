import { registerAs } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import type { RedisOptions } from 'ioredis';

/**
 * 创建标准的 Redis 连接配置
 * 用于 RedisService 和 BullMQ，确保配置一致性
 */
export function createRedisOptions(config: {
  host: string;
  port: number;
  password?: string;
  db: number;
}): RedisOptions {
  const logger = new Logger('RedisConfig');

  // 添加详细日志
  logger.log(`=== Redis 连接配置 ===`);
  logger.log(`Host: ${config.host}`);
  logger.log(`Port: ${config.port}`);
  logger.log(`DB: ${config.db}`);
  logger.log(`Password 长度: ${config.password?.length || 0}`);
  logger.log(`=======================`);

  return {
    host: config.host,
    port: config.port,
    password: config.password,
    db: config.db,
    // 启用 TCP keepAlive，每 30 秒发送心跳包保持连接活跃
    keepAlive: 30000,
    // 连接超时设置（10秒）
    connectTimeout: 10000,
    // 命令执行超时设置（5秒）
    commandTimeout: 30000,
    // 启用离线队列，确保连接断开时命令不会丢失
    enableOfflineQueue: true,
    // 重连策略：使用指数退避算法
    retryStrategy: (times: number) => {
      if (times > 10) {
        // 超过 10 次重连后停止
        logger.error('Redis 重连次数超过限制，停止重连');
        return null;
      }
      // 指数退避：重连延迟时间为 Math.min(times * 200, 3000) ms
      const delay = Math.min(times * 200, 3000);
      logger.warn(`Redis 重连中... 第 ${times} 次尝试，${delay}ms 后重试`);
      return delay;
    },
    // 启用自动重连
    reconnectOnError: (err: Error) => {
      const targetError = 'READONLY';
      if (err.message.includes(targetError)) {
        // 仅在特定错误时重连
        return true;
      }
      return false;
    },
  };
}

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
}));
