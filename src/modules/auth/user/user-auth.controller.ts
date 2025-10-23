import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './services/auth.service';
import { WechatLoginDto } from './dto/wechat-login.dto';
import { AuthResponseDto, UserProfileDto } from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * 用户认证控制器
 * 提供微信授权登录和用户信息查询接口
 */
@ApiTags('用户认证')
@Controller('auth/user')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

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
    return this.authService.wechatLogin(wechatLoginDto.code);
  }

  /**
   * 获取当前用户信息
   * 需要在Header中携带JWT token
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '需要JWT认证，返回当前登录用户的信息',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    type: UserProfileDto,
  })
  @ApiResponse({
    status: 401,
    description: '未授权或token无效',
  })
  async getProfile(@Request() req): Promise<UserProfileDto> {
    // req.user 是由 JwtStrategy 验证后挂载的
    const { openid, createdAt, updatedAt } = req.user;
    return { openid, createdAt, updatedAt };
  }
}
