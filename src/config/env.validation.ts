import * as Joi from 'joi';

export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(10),
  DATABASE_URL: Joi.string().required(),

  // Redis 配置
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().port().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_DB: Joi.number().default(0),

  // 日志配置
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace')
    .default('warn'),
  LOG_PRETTY: Joi.boolean().default(false),

  // Unitel API 配置
  UNITEL_USERNAME: Joi.string().required(),
  UNITEL_PASSWORD: Joi.string().required(),
  UNITEL_BASE_URL: Joi.string().uri().default('https://api.unitel.mn/api/v1'),

  // 微信公众号配置
  WECHAT_APPID: Joi.string().required(),
  WECHAT_SECRET: Joi.string().required(),

  // 微信支付配置
  WECHAT_PAY_MCHID: Joi.string().required(),
  WECHAT_PAY_SERIAL_NO: Joi.string().required(),
  WECHAT_PAY_PRIVATE_KEY: Joi.string().required(), // Base64编码的商户私钥
  WECHAT_PAY_APIV3_KEY: Joi.string().length(32).required(), // 32字符的APIv3密钥
  WECHAT_PAY_NOTIFY_URL: Joi.string().uri().required(), // 支付回调URL
  WECHAT_PAY_REFUND_NOTIFY_URL: Joi.string().uri().optional(), // 退款回调URL（可选）

  // JWT 配置
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('7d'),
});
