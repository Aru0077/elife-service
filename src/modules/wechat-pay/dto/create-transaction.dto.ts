import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

/**
 * 创建支付订单DTO
 */
export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(32)
  out_trade_no: string; // 商户订单号（6-32位）

  @IsString()
  @IsNotEmpty()
  @MaxLength(127)
  description: string; // 商品描述

  @IsNumber()
  @Min(1)
  total: number; // 订单金额（分）

  @IsString()
  @IsNotEmpty()
  openid: string; // 用户openid

  @IsString()
  @IsOptional()
  @MaxLength(128)
  attach?: string; // 附加数据

  @IsString()
  @IsOptional()
  time_expire?: string; // 交易结束时间（RFC3339格式）

  @IsString()
  @IsOptional()
  goods_tag?: string; // 订单优惠标记
}
