import { registerAs } from '@nestjs/config';

/**
 * Unitel API 配置
 */
export default registerAs('unitel', () => ({
  // API 凭证
  username: process.env.UNITEL_USERNAME,
  password: process.env.UNITEL_PASSWORD,

  // API 基础配置
  baseUrl: process.env.UNITEL_BASE_URL || 'https://api.unitel.mn/api/v1',
  timeout: 30000, // 30秒超时
  retryAttempts: 3, // 最大重试次数

  // Token Redis 缓存配置
  tokenKey: 'unitel:access_token', // Redis Key
  tokenTTL: 3600, // Token 过期时间（秒，1小时）
}));

/**
 * Unitel API 端点常量
 */
export const UNITEL_ENDPOINTS = {
  AUTH: '/auth', // 获取 Token
  SERVICE_TYPE: '/service/servicetype', // 获取资费列表
  INVOICE: '/service/unitel', // 获取后付费账单
  RECHARGE: '/service/recharge', // 充值话费
  DATA_PACKAGE: '/service/datapackage', // 充值流量
  PAYMENT: '/service/payment', // 支付后付费账单
} as const;
