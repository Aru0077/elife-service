import { registerAs } from '@nestjs/config';

/**
 * 日志配置
 */
export default registerAs('logger', () => ({
  // 日志级别 (fatal, error, warn, info, debug, trace)
  level: process.env.LOG_LEVEL || 'warn',

  // 是否启用美化输出（开发环境）
  pretty: process.env.LOG_PRETTY === 'true',

  // 阿里云 SLS 配置
  sls: {
    enabled: process.env.ALIYUN_SLS_ENABLED === 'true',
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID || '',
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET || '',
    endpoint: process.env.ALIYUN_SLS_ENDPOINT || 'cn-beijing.log.aliyuncs.com',
    project: process.env.ALIYUN_SLS_PROJECT || 'elife-service-logs',
    logstore: process.env.ALIYUN_SLS_LOGSTORE || 'app-logs',
  },
}));
