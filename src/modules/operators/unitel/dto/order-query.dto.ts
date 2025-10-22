import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus, RechargeStatus, OrderType } from '../enums';

/**
 * 订单查询请求 DTO
 * 用于用户查询自己的订单列表
 */
export class OrderQueryDto {
  @ApiProperty({
    description: '用户 openid',
    example: 'oxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  openid: string;

  @ApiProperty({
    description: '订单类型',
    enum: OrderType,
    required: false,
  })
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  @ApiProperty({
    description: '支付状态',
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiProperty({
    description: '充值状态',
    enum: RechargeStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(RechargeStatus)
  rechargeStatus?: RechargeStatus;

  @ApiProperty({
    description: '页码',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: '每页数量',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
