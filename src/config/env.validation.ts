import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
  DATABASE_URL: Joi.string().required(),

  // 日志配置
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('warn'),
  LOG_PRETTY: Joi.boolean().default(false),

  // 阿里云 SLS 配置
  ALIYUN_SLS_ENABLED: Joi.boolean().default(false),
  ALIYUN_ACCESS_KEY_ID: Joi.string().optional(),
  ALIYUN_ACCESS_KEY_SECRET: Joi.string().optional(),
  ALIYUN_SLS_ENDPOINT: Joi.string().default('cn-beijing.log.aliyuncs.com'),
  ALIYUN_SLS_PROJECT: Joi.string().default('elife-service-logs'),
  ALIYUN_SLS_LOGSTORE: Joi.string().default('app-logs'),

  // 微信公众号配置
  WECHAT_APPID: Joi.string().required(),
  WECHAT_SECRET: Joi.string().required(),

  // JWT 配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
});
