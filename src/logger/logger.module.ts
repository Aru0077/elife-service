import { Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import pinoPretty from 'pino-pretty';
import type { IncomingMessage, ServerResponse } from 'http';
import loggerConfig from './config/logger.config';
import { ThirdPartyLoggerService } from './services/third-party-logger.service';
import { randomUUID } from 'crypto';

@Module({
  imports: [
    ConfigModule.forFeature(loggerConfig),
    PinoLoggerModule.forRootAsync({
      imports: [ConfigModule.forFeature(loggerConfig)],
      inject: [loggerConfig.KEY],
      useFactory: (config: ConfigType<typeof loggerConfig>) => {
        // 日志输出流配置
        // SAE环境下，JSON格式的stdout会被自动采集到SLS
        const stream = config.pretty
          ? // 开发环境：美化输出
            pinoPretty({
              colorize: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
              ignore: 'pid,hostname',
            })
          : // 生产环境：JSON格式输出到stdout，SAE自动采集
            process.stdout;

        return {
          pinoHttp: {
            level: config.level,
            // 自动日志记录配置（精简模式）
            autoLogging: {
              ignore: (req: IncomingMessage) => {
                // 忽略健康检查接口
                return req.url?.includes('/health') || false;
              },
            },
            // 自定义请求日志格式
            customProps: (req: IncomingMessage & { id?: string | number }) => {
              const userAgentHeader = req.headers['user-agent'] as
                | string
                | string[]
                | undefined;
              return {
                traceId: String(req.id || randomUUID()),
                userAgent: Array.isArray(userAgentHeader)
                  ? userAgentHeader[0] || 'unknown'
                  : userAgentHeader || 'unknown',
              };
            },
            // 自定义日志格式
            customLogLevel: (_req: IncomingMessage, res: ServerResponse) => {
              if (res.statusCode >= 500) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            // 仅记录错误的请求体
            customSuccessMessage: (
              _req: IncomingMessage,
              res: ServerResponse,
            ) => {
              if (res.statusCode >= 400) {
                return `Request failed with status ${res.statusCode}`;
              }
              return 'Request completed';
            },
            // 序列化配置
            serializers: {
              req: (req: IncomingMessage & { id?: string }) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                // 精简模式：只记录关键 headers
                headers: {
                  'user-agent': req.headers['user-agent'],
                  'content-type': req.headers['content-type'],
                },
              }),
              res: (res: ServerResponse) => ({
                statusCode: res.statusCode,
              }),
              err: (err: Error) => ({
                type: err.name,
                message: err.message,
                stack: err.stack,
              }),
            },
            // 输出流：开发环境美化，生产环境JSON
            stream,
          },
        };
      },
    }),
  ],
  providers: [ThirdPartyLoggerService],
  exports: [PinoLoggerModule, ThirdPartyLoggerService],
})
export class LoggerModule {}
