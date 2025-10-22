import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * 获取资费列表请求 DTO
 */
export class GetServiceTypeDto {
  @ApiProperty({
    description: '手机号',
    example: '99887766',
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: '手机号必须是8位数字' })
  msisdn: string;
}
