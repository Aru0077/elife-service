import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * 支付订单请求 DTO
 * 用于微信支付回调后触发 Unitel API 充值
 */
export class PayOrderDto {
  @ApiProperty({
    description: '订单号',
    example: 'UNI202501221234567890',
  })
  @IsString()
  orderNo: string;

  @ApiProperty({
    description: '微信支付交易号（可选，用于记录）',
    example: '4200001234567890123456789012345678',
    required: false,
  })
  @IsString()
  wechatTransactionId?: string;
}
