import * as ALY from '@alicloud/log';
import type { SlsLogGroup, SlsLogItem } from '../interfaces/logger.interface';

/**
 * 阿里云 SLS Transport 配置
 */
export interface SlsTransportConfig {
  enabled: boolean;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint: string;
  project: string;
  logstore: string;
}

/**
 * 阿里云 SLS Transport
 * 将 Pino 日志批量上传到阿里云日志服务
 */
export class SlsTransport {
  private client: ALY.default | null = null;
  private buffer: SlsLogItem[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100; // 批量上传阈值
  private readonly FLUSH_INTERVAL = 5000; // 5秒强制刷新

  constructor(private readonly config: SlsTransportConfig) {
    if (this.config.enabled && this.validateConfig()) {
      this.initializeClient();
      this.startFlushTimer();
    }
  }

  /**
   * 验证配置
   */
  private validateConfig(): boolean {
    const { accessKeyId, accessKeySecret, endpoint, project, logstore } =
      this.config;

    if (!accessKeyId || !accessKeySecret) {
      console.warn('[SLS Transport] AccessKey 未配置，SLS 日志上传已禁用');
      return false;
    }

    if (!endpoint || !project || !logstore) {
      console.warn('[SLS Transport] SLS 配置不完整，日志上传已禁用');
      return false;
    }

    return true;
  }

  /**
   * 初始化 SLS 客户端
   */
  private initializeClient(): void {
    try {
      this.client = new ALY.default({
        accessKeyId: this.config.accessKeyId,
        accessKeySecret: this.config.accessKeySecret,
        endpoint: `https://${this.config.endpoint}`,
      });
      console.log('[SLS Transport] 阿里云 SLS 客户端初始化成功');
    } catch (error) {
      console.error('[SLS Transport] 初始化失败:', error);
      this.client = null;
    }
  }

  /**
   * 启动定时刷新
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      void this.flush();
    }, this.FLUSH_INTERVAL);
  }

  /**
   * 写入日志（Pino transport 接口）
   */
  write(logObject: Record<string, unknown>): void {
    if (!this.config.enabled || !this.client) {
      return;
    }

    try {
      const logItem = this.formatLogItem(logObject);
      this.buffer.push(logItem);

      // 达到阈值，立即刷新
      if (this.buffer.length >= this.BUFFER_SIZE) {
        void this.flush();
      }
    } catch (error) {
      console.error('[SLS Transport] 写入日志失败:', error);
    }
  }

  /**
   * 格式化日志项
   */
  private formatLogItem(logObject: Record<string, unknown>): SlsLogItem {
    const contents: Array<{ key: string; value: string }> = [];

    // 遍历日志对象，转换为 key-value 格式
    for (const [key, value] of Object.entries(logObject)) {
      // 跳过 time 字段，单独处理
      if (key === 'time') continue;

      // 转换为字符串
      const stringValue =
        typeof value === 'object' ? JSON.stringify(value) : String(value);

      contents.push({ key, value: stringValue });
    }

    return {
      time: Math.floor((logObject.time as number) / 1000) || Date.now(), // 转换为秒级时间戳
      contents,
    };
  }

  /**
   * 刷新缓冲区（批量上传）
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0 || !this.client) {
      return;
    }

    const logs = [...this.buffer];
    this.buffer = [];

    try {
      const logGroup: SlsLogGroup = {
        logs,
        topic: 'app-logs',
        source: 'elife-service',
      };

      await this.client.putLogs({
        projectName: this.config.project,
        logStoreName: this.config.logstore,
        logGroup,
      });

      console.log(`[SLS Transport] 成功上传 ${logs.length} 条日志到 SLS`);
    } catch (error) {
      console.error('[SLS Transport] 上传日志失败:', error);
      // 失败时重新放回缓冲区（避免日志丢失）
      this.buffer.unshift(...logs);

      // 限制缓冲区大小，避免内存泄漏
      if (this.buffer.length > this.BUFFER_SIZE * 2) {
        this.buffer = this.buffer.slice(-this.BUFFER_SIZE);
      }
    }
  }

  /**
   * 清理资源
   */
  async destroy(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // 最后一次刷新
    await this.flush();

    this.client = null;
    console.log('[SLS Transport] 已清理资源');
  }
}

/**
 * 创建 SLS Transport 流（用于 Pino）
 */
export function createSlsTransportStream(
  config: SlsTransportConfig,
): NodeJS.WritableStream {
  const transport = new SlsTransport(config);

  // 创建可写流
  const { Writable } = require('stream');
  const stream = new Writable({
    objectMode: true,
    write(
      chunk: unknown,
      _encoding: string,
      callback: (error?: Error | null) => void,
    ) {
      try {
        transport.write(chunk as Record<string, unknown>);
        callback();
      } catch (error) {
        callback(error instanceof Error ? error : new Error(String(error)));
      }
    },
    final(callback: (error?: Error | null) => void) {
      void transport
        .destroy()
        .then(() => callback())
        .catch(callback);
    },
  });

  return stream;
}
