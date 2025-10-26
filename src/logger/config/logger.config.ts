import { registerAs } from '@nestjs/config';

/**
 * 日志配置
 *
 * 注意：SAE部署时，日志会自动采集stdout输出到SLS，
 * 无需在代码中手动推送日志到SLS。
 */
export default registerAs('logger', () => ({
  // 日志级别 (fatal, error, warn, info, debug, trace)
  level: process.env.LOG_LEVEL || 'warn',

  // 是否启用美化输出（开发环境）
  // 生产环境应设置为 false，输出JSON格式便于SAE采集
  pretty: process.env.LOG_PRETTY === 'true',
}));
