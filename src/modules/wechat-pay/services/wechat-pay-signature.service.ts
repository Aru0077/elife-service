import { Injectable, Inject } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createSign } from 'crypto';
import wechatPayConfig from '../config/wechat-pay.config';
import { PaymentCallbackHeaders } from '../interfaces/wechat-pay.interface';

/**
 * 微信支付签名服务
 * 负责生成请求签名和验证回调签名
 */
@Injectable()
export class WechatPaySignatureService {
  constructor(
    @Inject(wechatPayConfig.KEY)
    private readonly config: ConfigType<typeof wechatPayConfig>,
  ) {}

  /**
   * 生成请求签名（用于Authorization头）
   * 算法：SHA256withRSA
   *
   * @param method HTTP方法（GET、POST等）
   * @param url 请求URL路径（不含域名和query参数）
   * @param timestamp 时间戳（秒）
   * @param nonce 随机字符串
   * @param body 请求体（GET请求为空字符串）
   * @returns Authorization头的值
   */
  generateAuthorizationHeader(
    method: string,
    url: string,
    timestamp: number,
    nonce: string,
    body: string,
  ): string {
    // 1. 构造签名串
    const signatureStr = [
      method, // HTTP方法
      url, // URL路径
      timestamp, // 时间戳
      nonce, // 随机串
      body, // 请求体
    ].join('\n');

    // 添加换行符（微信要求）
    const message = signatureStr + '\n';

    // 2. 使用商户私钥进行SHA256withRSA签名
    const sign = createSign('RSA-SHA256');
    sign.update(message);
    const signature = sign.sign(this.config.privateKey, 'base64');

    // 3. 构造Authorization头
    // 格式：WECHATPAY2-SHA256-RSA2048 mchid="商户号",nonce_str="随机串",timestamp="时间戳",serial_no="证书序列号",signature="签名值"
    const authorization = [
      `WECHATPAY2-SHA256-RSA2048`,
      `mchid="${this.config.mchid}"`,
      `nonce_str="${nonce}"`,
      `timestamp="${timestamp}"`,
      `serial_no="${this.config.serialNo}"`,
      `signature="${signature}"`,
    ].join(',');

    return authorization;
  }

  /**
   * 验证微信支付回调签名
   * 注意：实际生产环境需要使用微信支付平台证书的公钥验证
   * 这里仅提供签名验证的框架，需要商户自行下载和管理平台证书
   *
   * @param headers 回调请求头
   * @param body 回调请求体（原始JSON字符串）
   * @returns 是否验证通过
   */
  verifyCallbackSignature(
    headers: PaymentCallbackHeaders,
    body: string,
  ): boolean {
    // 1. 构造验签串
    const signatureStr = [
      headers['wechatpay-timestamp'], // 时间戳
      headers['wechatpay-nonce'], // 随机串
      body, // 请求体（原始JSON）
    ].join('\n');

    const message = signatureStr + '\n';

    // 2. 验证签名
    // TODO: 实际生产环境需要使用微信支付平台证书公钥进行验证
    // 这里返回true是为了演示流程，生产环境必须实现真实的签名验证
    // 参考：https://pay.weixin.qq.com/doc/v3/merchant/4012791867

    // 示例代码（需要商户下载平台证书）：
    // const verify = createVerify('RSA-SHA256');
    // verify.update(_message);
    // const isValid = verify.verify(platformPublicKey, headers['wechatpay-signature'], 'base64');

    // 暂时跳过签名验证（生产环境必须启用）
    console.warn('⚠️  微信支付回调签名验证已跳过，生产环境必须实现真实验证！');

    // 3. 验证时间戳（防重放攻击）
    const timestamp = parseInt(headers['wechatpay-timestamp'], 10);
    const now = Math.floor(Date.now() / 1000);
    const timeDiff = Math.abs(now - timestamp);

    // 时间戳超过5分钟则拒绝
    if (timeDiff > 300) {
      console.error('回调时间戳过期', { timestamp, now, timeDiff });
      return false;
    }

    return true;
  }

  /**
   * 生成随机字符串（用于nonce）
   * @param length 字符串长度（默认32）
   * @returns 随机字符串
   */
  generateNonce(length = 32): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取当前时间戳（秒）
   * @returns 时间戳
   */
  getTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}
