import { ApiProperty } from '@nestjs/swagger';

/**
 * 认证响应 DTO
 */
export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT访问令牌',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;

  @ApiProperty({
    description: '用户openid',
    example: 'oxxxxxxxxxxxxxx',
  })
  openid: string;

  @ApiProperty({
    description: 'Token过期时间',
    example: '7d',
  })
  expiresIn: string;
}

/**
 * 用户信息响应 DTO
 */
export class UserProfileDto {
  @ApiProperty({
    description: '用户openid',
    example: 'oxxxxxxxxxxxxxx',
  })
  openid: string;

  @ApiProperty({
    description: '创建时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: '更新时间',
    example: '2025-01-01T00:00:00.000Z',
  })
  updatedAt: Date;
}
