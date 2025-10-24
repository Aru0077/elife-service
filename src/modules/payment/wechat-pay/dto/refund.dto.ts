import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';

/**
 * 申请退款DTO
 */
export class CreateRefundDto {
  @IsString()
  @IsOptional()
  @MaxLength(32)
  transaction_id?: string; // 微信支付订单号（与out_trade_no二选一）

  @IsString()
  @IsOptional()
  @MinLength(6)
  @MaxLength(32)
  out_trade_no?: string; // 商户订单号（与transaction_id二选一）

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  out_refund_no: string; // 商户退款单号

  @IsNumber()
  @Min(1)
  refund: number; // 退款金额（分）

  @IsNumber()
  @Min(1)
  total: number; // 原订单金额（分）

  @IsString()
  @IsOptional()
  @MaxLength(80)
  reason?: string; // 退款原因

  @IsString()
  @IsOptional()
  notify_url?: string; // 退款回调URL
}

/**
 * 查询退款DTO
 */
export class QueryRefundDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  out_refund_no: string; // 商户退款单号
}
