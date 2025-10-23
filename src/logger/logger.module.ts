import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import loggerConfig from './config/logger.config';
import { ThirdPartyLoggerService } from './services/third-party-logger.service';
import { createSlsTransportStream } from './transports/sls.transport';
import { randomUUID } from 'crypto';

@Module({
  imports: [
    ConfigModule.forFeature(loggerConfig),
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule.forFeature(loggerConfig)],
      inject: [loggerConfig.KEY],
      useFactory: (config: ConfigType<typeof loggerConfig>) => {
        const streams: Array<{
          level?: string;
          stream: NodeJS.WritableStream;
        }> = [];

        // 控制台输出
        if (config.pretty) {
          // 开发环境：美化输出
          const pino = require('pino');
          const pretty = require('pino-pretty');
          streams.push({
            stream: pretty({
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
            }),
          });
        } else {
          // 生产环境：JSON 输出
          streams.push({
            stream: process.stdout,
          });
        }

        // 阿里云 SLS 输出
        if (config.sls.enabled) {
          streams.push({
            level: 'warn', // SLS 只记录 warn 及以上级别
            stream: createSlsTransportStream(config.sls),
          });
        }

        return {
          pinoHttp: {
            level: config.level,
            // 自动日志记录配置（精简模式）
            autoLogging: {
              ignore: (req) => {
                // 忽略健康检查接口
                return req.url?.includes('/health') || false;
              },
            },
            // 自定义请求日志格式
            customProps: (req) => ({
              traceId: (req as any).id || randomUUID(),
              userAgent: req.headers?.['user-agent'] || 'unknown',
            }),
            // 自定义日志格式
            customLogLevel: (_req: unknown, res: { statusCode: number }) => {
              if (res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            // 仅记录错误的请求体
            customSuccessMessage: (
              _req: unknown,
              res: { statusCode: number },
            ) => {
              if (res.statusCode >= 400) {
                return `Request failed with status ${res.statusCode}`;
              }
              return 'Request completed';
            },
            // 序列化配置
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                // 精简模式：只记录关键 headers
                headers: {
                  'user-agent': req.headers?.['user-agent'],
                  'content-type': req.headers?.['content-type'],
                },
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
              err: (err) => ({
                type: err.name,
                message: err.message,
                stack: (err as Error).stack,
              }),
            },
            // 使用多流
            stream:
              streams.length > 1
                ? require('pino').multistream(streams)
                : streams[0].stream,
          },
        };
      },
    }),
  ],
  providers: [ThirdPartyLoggerService],
  exports: [PinoLoggerModule, ThirdPartyLoggerService],
})
export class LoggerModule {}
