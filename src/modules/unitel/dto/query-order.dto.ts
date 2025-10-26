import { IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus, RechargeStatus, OrderType } from '@prisma/client';

/**
 * 查询订单 DTO
 */
export class QueryOrderDto {
  /** 支付状态 */
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  /** 充值状态 */
  @IsOptional()
  @IsEnum(RechargeStatus)
  rechargeStatus?: RechargeStatus;

  /** 订单类型 */
  @IsOptional()
  @IsEnum(OrderType)
  orderType?: OrderType;

  /** 页码，默认第 1 页 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** 每页数量 */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 20;
}
