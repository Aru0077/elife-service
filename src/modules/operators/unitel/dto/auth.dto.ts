import { ApiProperty } from '@nestjs/swagger';

/**
 * Unitel Token 响应
 */
export class UnitelTokenDto {
  @ApiProperty({ example: 'zezicy6Gfw6XG3OW6X2W', description: 'Access Token' })
  access_token: string;

  @ApiProperty({ example: 'Bearer', description: 'Token 类型' })
  token_type: string;

  @ApiProperty({ example: '0', description: '过期时间（Unitel返回0）' })
  expires_in: string;

  @ApiProperty({ example: '', description: 'Token 作用域' })
  scope: string;
}
