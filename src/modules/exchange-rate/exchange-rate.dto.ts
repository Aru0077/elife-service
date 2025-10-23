import { ApiProperty } from '@nestjs/swagger';

/**
 * 汇率响应 DTO
 */
export class ExchangeRateResponseDto {
  @ApiProperty({ description: '汇率ID', example: 'MNT_CNY' })
  id: string;

  @ApiProperty({ description: '汇率值', example: '440.0000' })
  rate: string;

  @ApiProperty({ description: '创建时间' })
  createdAt: Date;

  @ApiProperty({ description: '更新时间' })
  updatedAt: Date;
}
