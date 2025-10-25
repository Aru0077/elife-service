import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PinoLogger } from 'nestjs-pino';
import { AuthService } from './services/auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

/**
 * 用户认证控制器
 * 提供微信授权登录接口
 */
@ApiTags('用户认证')
@Controller('auth/user')
export class UserAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UserAuthController.name);
  }

  /**
   * 微信授权登录
   * 前端通过微信获取code后调用此接口完成登录
   */
  @Post('wechat')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '微信授权登录',
    description: '前端获取微信code后调用此接口，后端返回JWT token',
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'code无效或已过期',
  })
  @ApiResponse({
    status: 500,
    description: '微信授权服务暂时不可用',
  })
  async wechatLogin(
    @Body() wechatLoginDto: WechatLoginDto,
  ): Promise<AuthResponseDto> {
    this.logger.info(
      `微信授权登录请求: code=${wechatLoginDto.code.substring(0, 10)}...`,
    );
    const result = await this.authService.wechatLogin(wechatLoginDto.code);
    this.logger.info(`用户登录成功: openid=${result.openid}`);
    return result;
  }
}
