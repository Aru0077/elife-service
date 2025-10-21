import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'zezicy6Gfw6XG3OW6X2W' })
  access_token: string;

  @ApiProperty({ example: 'Bearer' })
  token_type: string;

  @ApiProperty({ example: '0' })
  expires_in: string;

  @ApiProperty({ example: '' })
  scope: string;
}
