import { Injectable, Inject } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import type { ThirdPartyApiLog } from '../interfaces/logger.interface';

/**
 * 第三方 API 日志服务
 * 专门用于记录对第三方 API（如 Unitel）的完整调用日志
 */
@Injectable()
export class ThirdPartyLoggerService {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(ThirdPartyLoggerService.name);
  }

  /**
   * 记录第三方 API 调用日志
   */
  logApiCall(log: ThirdPartyApiLog): void {
    // 敏感信息脱敏
    const sanitizedLog = this.sanitizeLog(log);

    this.logger.info(
      {
        type: 'third_party_api',
        ...sanitizedLog,
      },
      `[${log.service}] ${log.method} ${log.url}`,
    );
  }

  /**
   * 记录第三方 API 调用成功
   */
  logApiSuccess(log: Omit<ThirdPartyApiLog, 'error'>): void {
    this.logApiCall(log as ThirdPartyApiLog);
  }

  /**
   * 记录第三方 API 调用失败
   */
  logApiError(log: ThirdPartyApiLog): void {
    const sanitizedLog = this.sanitizeLog(log);

    this.logger.error(
      {
        type: 'third_party_api_error',
        ...sanitizedLog,
      },
      `[${log.service}] ${log.method} ${log.url} - ${log.error}`,
    );
  }

  /**
   * 敏感信息脱敏
   */
  private sanitizeLog(log: ThirdPartyApiLog): ThirdPartyApiLog {
    const sensitiveKeys = [
      'password',
      'token',
      'authorization',
      'access_token',
      'secret',
      'api_key',
    ];

    return {
      ...log,
      requestHeaders: this.sanitizeObject(
        log.requestHeaders,
        sensitiveKeys,
      ) as Record<string, string>,
      requestBody: this.sanitizeObject(
        log.requestBody as Record<string, unknown>,
        sensitiveKeys,
      ),
      responseHeaders: this.sanitizeObject(
        log.responseHeaders,
        sensitiveKeys,
      ) as Record<string, string>,
      responseBody: this.sanitizeObject(
        log.responseBody as Record<string, unknown>,
        sensitiveKeys,
      ),
    };
  }

  /**
   * 脱敏对象中的敏感字段
   */
  private sanitizeObject(
    obj: Record<string, unknown> | Record<string, string> | undefined,
    sensitiveKeys: string[],
  ): Record<string, string> | Record<string, unknown> | undefined {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      const isSensitive = sensitiveKeys.some((sk) => lowerKey.includes(sk));

      if (isSensitive) {
        sanitized[key] = '***REDACTED***';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeObject(
          value as Record<string, unknown>,
          sensitiveKeys,
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized as Record<string, string>;
  }
}
