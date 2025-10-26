import { IsString, IsNotEmpty, MaxLength, MinLength } from 'class-validator';

/**
 * 查询订单DTO（通过商户订单号）
 */
export class QueryTransactionDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  @MaxLength(32)
  out_trade_no: string; // 商户订单号
}

/**
 * 查询订单DTO（通过微信支付订单号）
 */
export class QueryTransactionByIdDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  transaction_id: string; // 微信支付订单号
}
