import { IsString, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * 微信授权登录请求 DTO
 */
export class WechatLoginDto {
  @ApiProperty({
    description: '微信授权code（前端从微信回调获取）',
    example: '061abc123def456...',
  })
  @IsString()
  @IsNotEmpty({ message: 'code不能为空' })
  @Length(1, 512, { message: 'code长度异常' })
  code: string;
}
