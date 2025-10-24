import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { createDecipheriv } from 'crypto';
import wechatPayConfig from '../config/wechat-pay.config';

/**
 * 微信支付加解密服务
 * 负责AES-256-GCM解密回调数据
 */
@Injectable()
export class WechatPayCryptoService {
  constructor(
    @Inject(wechatPayConfig.KEY)
    private readonly config: ConfigType<typeof wechatPayConfig>,
  ) {}

  /**
   * AES-256-GCM 解密
   * 用于解密微信支付回调通知中的resource.ciphertext字段
   *
   * @param ciphertext 密文（Base64编码）
   * @param nonce 随机串
   * @param associatedData 附加数据
   * @returns 解密后的明文（JSON字符串）
   */
  decryptAesGcm(
    ciphertext: string,
    nonce: string,
    associatedData: string,
  ): string {
    try {
      // 1. Base64解码密文
      const ciphertextBuffer = Buffer.from(ciphertext, 'base64');

      // 2. GCM模式下，密文格式为: 实际密文 + 16字节认证标签(tag)
      // 提取认证标签（最后16字节）
      const authTag = ciphertextBuffer.subarray(-16);
      // 提取实际密文（除去最后16字节）
      const encryptedData = ciphertextBuffer.subarray(0, -16);

      // 3. 创建解密器
      // 算法：aes-256-gcm
      // 密钥：APIv3密钥（32字节）
      // IV/Nonce：随机串（12字节）
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.config.apiv3Key,
        nonce,
      );

      // 4. 设置认证标签
      decipher.setAuthTag(authTag);

      // 5. 设置附加数据（AAD）
      decipher.setAAD(Buffer.from(associatedData, 'utf8'));

      // 6. 解密
      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      // 7. 返回明文（UTF-8字符串）
      return decrypted.toString('utf8');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new BadRequestException(
        `微信支付回调数据解密失败: ${errorMessage}`,
      );
    }
  }
}
