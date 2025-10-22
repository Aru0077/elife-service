import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/**
 * 获取后付费账单请求 DTO
 */
export class GetInvoiceDto {
  @ApiProperty({
    description: '手机号',
    example: '99887766',
  })
  @IsString()
  @Matches(/^\d{8}$/, { message: '手机号必须是8位数字' })
  msisdn: string;
}
