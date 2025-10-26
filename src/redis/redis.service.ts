import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Redis 服务
 * 提供基础的 Redis 操作方法
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  constructor(private configService: ConfigService) {
    const config = {
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
      // 启用 TCP keepAlive，每 30 秒发送心跳包保持连接活跃
      keepAlive: 30000,
      // 连接超时设置（10秒）
      connectTimeout: 10000,
      // 命令执行超时设置（5秒）
      commandTimeout: 5000,
      // 启用离线队列，确保连接断开时命令不会丢失
      enableOfflineQueue: true,
      // 重连策略：使用指数退避算法
      retryStrategy: (times: number) => {
        if (times > 10) {
          // 超过 10 次重连后停止
          this.logger.error('Redis 重连次数超过限制，停止重连');
          return null;
        }
        // 指数退避：重连延迟时间为 Math.min(times * 200, 3000) ms
        const delay = Math.min(times * 200, 3000);
        this.logger.warn(`Redis 重连中... 第 ${times} 次尝试，${delay}ms 后重试`);
        return delay;
      },
      // 启用自动重连
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // 仅在特定错误时重连
          return true;
        }
        return false;
      },
    };

    this.client = new Redis(config);

    // 监听连接成功事件
    this.client.on('connect', () => {
      this.logger.log('Redis 连接成功');
    });

    // 监听准备就绪事件
    this.client.on('ready', () => {
      this.logger.log('Redis 已就绪，可以接收命令');
    });

    // 监听重连事件
    this.client.on('reconnecting', (time: number) => {
      this.logger.warn(`Redis 正在重连... 延迟: ${time}ms`);
    });

    // 监听错误事件
    this.client.on('error', (error) => {
      this.logger.error('Redis 连接错误', error);
    });

    // 监听关闭事件
    this.client.on('close', () => {
      this.logger.warn('Redis 连接已关闭');
    });

    // 监听结束事件
    this.client.on('end', () => {
      this.logger.warn('Redis 连接已结束，不会再自动重连');
    });
  }

  /**
   * 获取值
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * 设置值（带过期时间）
   * @param key 键
   * @param value 值
   * @param ttl 过期时间（秒），可选
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * 删除值
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * 获取剩余过期时间（秒）
   */
  async ttl(key: string): Promise<number> {
    return this.client.ttl(key);
  }

  /**
   * 模块销毁时断开连接
   */
  onModuleDestroy() {
    this.client.disconnect();
    this.logger.log('Redis 连接已断开');
  }
}
