import { registerAs } from '@nestjs/config';

/**
 * 验证微信支付配置
 * 在应用启动时检查所有必需的环境变量
 */
function validateWechatPayConfig() {
  const requiredEnvVars = [
    'WECHAT_APPID',
    'WECHAT_PAY_MCHID',
    'WECHAT_PAY_SERIAL_NO',
    'WECHAT_PAY_PRIVATE_KEY',
    'WECHAT_PAY_APIV3_KEY',
    'WECHAT_PAY_NOTIFY_URL',
  ];

  const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `微信支付配置缺失必需的环境变量: ${missingVars.join(', ')}\n` +
      `请检查 .env 文件并确保已配置所有必需变量`,
    );
  }
}

/**
 * 微信支付配置
 */
export default registerAs('wechatPay', () => {
  // 验证配置
  validateWechatPayConfig();

  return {
    // 微信公众号APPID（复用已有配置）
    appid: process.env.WECHAT_APPID!,

    // 微信支付商户号
    mchid: process.env.WECHAT_PAY_MCHID!,

    // 商户证书序列号
    serialNo: process.env.WECHAT_PAY_SERIAL_NO!,

    // 商户私钥（Base64编码，解码后使用）
    privateKey: Buffer.from(
      process.env.WECHAT_PAY_PRIVATE_KEY!,
      'base64',
    ).toString('utf-8'),

    // APIv3密钥（用于AES-256-GCM解密）
    apiv3Key: process.env.WECHAT_PAY_APIV3_KEY!,

    // 支付回调通知URL
    notifyUrl: process.env.WECHAT_PAY_NOTIFY_URL!,

    // 退款回调通知URL（可选，默认使用notifyUrl）
    refundNotifyUrl: process.env.WECHAT_PAY_REFUND_NOTIFY_URL,

    // 微信支付API配置
    apiBaseUrl: 'https://api.mch.weixin.qq.com', // 主域名
    apiBackupUrl: 'https://api2.mch.weixin.qq.com', // 备用域名
    timeout: 10000, // 10秒超时
  };
});
