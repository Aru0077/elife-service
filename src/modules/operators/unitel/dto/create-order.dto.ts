import { IsString, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { OrderType } from '../enums';

/**
 * 创建订单 DTO
 */
export class CreateOrderDto {
  /** 手机号 */
  @IsString()
  msisdn: string;

  /** 订单类型 */
  @IsEnum(OrderType)
  orderType: OrderType;

  /** 套餐编码 */
  @IsString()
  packageCode: string;

  /** 套餐名称（蒙古语） */
  @IsString()
  packageName: string;

  /** 套餐英文名称 */
  @IsString()
  packageEngName: string;

  /** 套餐金额（蒙古图格里克，MNT） */
  @IsNumber()
  @Min(0)
  amountMnt: number;

  /** 人民币金额（CNY） */
  @IsNumber()
  @Min(0)
  amountCny: number;

  /** 话费单位（仅充值类型订单需要） */
  @IsOptional()
  @IsNumber()
  packageUnit?: number;

  /** 流量大小（仅流量类型订单需要，如"3GB"） */
  @IsOptional()
  @IsString()
  packageData?: string;

  /** 有效天数（仅流量类型订单需要） */
  @IsOptional()
  @IsNumber()
  packageDays?: number;
}
