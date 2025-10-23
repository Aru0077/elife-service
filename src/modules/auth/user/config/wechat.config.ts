import { registerAs } from '@nestjs/config';

/**
 * 微信公众号配置
 */
export default registerAs('wechat', () => ({
  // 微信公众号凭证
  appid: process.env.WECHAT_APPID,
  secret: process.env.WECHAT_SECRET,

  // 微信 API 配置
  oauth2Url: 'https://api.weixin.qq.com/sns/oauth2', // 网页授权API基础URL
  timeout: 10000, // 10秒超时
}));

/**
 * JWT 配置
 */
export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET,
  expiresIn: process.env.JWT_EXPIRES_IN || '7d', // 默认7天
}));
