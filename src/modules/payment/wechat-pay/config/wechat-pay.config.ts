import { registerAs } from '@nestjs/config';

/**
 * 微信支付配置
 */
export default registerAs('wechatPay', () => ({
  // 微信公众号APPID（复用已有配置）
  appid: process.env.WECHAT_APPID,

  // 微信支付商户号
  mchid: process.env.WECHAT_PAY_MCHID,

  // 商户证书序列号
  serialNo: process.env.WECHAT_PAY_SERIAL_NO,

  // 商户私钥（Base64编码，解码后使用）
  privateKey: process.env.WECHAT_PAY_PRIVATE_KEY
    ? Buffer.from(process.env.WECHAT_PAY_PRIVATE_KEY, 'base64').toString(
        'utf-8',
      )
    : '',

  // APIv3密钥（用于AES-256-GCM解密）
  apiv3Key: process.env.WECHAT_PAY_APIV3_KEY,

  // 支付回调通知URL
  notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL,

  // 退款回调通知URL（可选，默认使用notifyUrl）
  refundNotifyUrl: process.env.WECHAT_PAY_REFUND_NOTIFY_URL,

  // 微信支付API配置
  apiBaseUrl: 'https://api.mch.weixin.qq.com', // 主域名
  apiBackupUrl: 'https://api2.mch.weixin.qq.com', // 备用域名
  timeout: 10000, // 10秒超时
}));
