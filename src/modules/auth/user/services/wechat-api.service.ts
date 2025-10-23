import { Injectable, Inject, Logger } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import wechatConfig from '../config/wechat.config';
import {
  WechatAccessTokenResponse,
  WechatErrorResponse,
} from '../interfaces/wechat-auth.interface';

/**
 * 微信 API 服务
 * 封装微信网页授权相关 API 调用
 */
@Injectable()
export class WechatApiService {
  private readonly logger = new Logger(WechatApiService.name);

  constructor(
    @Inject(wechatConfig.KEY)
    private readonly config: ConfigType<typeof wechatConfig>,
    private readonly httpService: HttpService,
  ) {}

  /**
   * 通过 code 换取 access_token 和 openid
   * @param code 微信授权码
   * @returns 包含 openid 的授权信息
   */
  async getAccessTokenByCode(code: string): Promise<WechatAccessTokenResponse> {
    const url = `${this.config.oauth2Url}/access_token`;
    const params = {
      appid: this.config.appid,
      secret: this.config.secret,
      code,
      grant_type: 'authorization_code',
    };

    try {
      this.logger.log(`正在通过code换取微信access_token`);

      const response = await firstValueFrom(
        this.httpService.get<WechatAccessTokenResponse | WechatErrorResponse>(
          url,
          {
            params,
            timeout: this.config.timeout,
          },
        ),
      );

      const data = response.data;

      // 检查是否为错误响应
      if ('errcode' in data) {
        this.logger.error(`微信API返回错误: ${data.errcode} - ${data.errmsg}`);
        throw new BadRequestException(this.getWechatErrorMessage(data.errcode));
      }

      this.logger.log(`成功获取微信用户openid: ${data.openid}`);
      return data;
    } catch (error) {
      // 如果是已经抛出的 BadRequestException，直接传递
      if (error instanceof BadRequestException) {
        throw error;
      }

      // 其他错误统一处理
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`调用微信API失败: ${errorMessage}`, errorStack);
      throw new InternalServerErrorException('微信授权服务暂时不可用');
    }
  }

  /**
   * 获取微信错误码对应的友好错误信息
   * @param errcode 微信错误码
   * @returns 友好的错误信息
   */
  private getWechatErrorMessage(errcode: number): string {
    const errorMessages: Record<number, string> = {
      40029: '无效的code或code已过期，请重新授权',
      40163: 'code已被使用',
      40001: '微信AppSecret错误或已过期',
      40002: '无效的grant_type参数',
      40003: '无效的OpenID',
      40013: '无效的AppID',
      41001: '缺少access_token参数',
      41002: '缺少appid参数',
      41003: '缺少refresh_token参数',
      41004: '缺少secret参数',
      41005: '缺少多媒体文件数据',
      41006: '缺少media_id参数',
      42001: 'access_token超时',
      42002: 'refresh_token超时',
      42003: 'code超时',
      50001: '用户未授权该API',
    };

    return errorMessages[errcode] || `微信授权失败（错误码：${errcode}）`;
  }
}
