import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionDto } from './recharge.dto';

/**
 * 支付后付费账单 - 请求
 */
export class PayInvoiceRequestDto {
  @ApiProperty({ example: '8XXXXXXX', description: '手机号码 (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({ example: '100', description: '支付金额' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ example: 'description', description: '支付备注' })
  @IsString()
  @IsNotEmpty()
  remark: string;

  @ApiProperty({ example: '1', description: 'VAT标志 (1=开发票, 0=不开)' })
  @IsString()
  @IsNotEmpty()
  vatflag: string;

  @ApiProperty({ example: 'XXXXXXX', description: 'VAT注册号' })
  @IsString()
  vat_register_no: string;

  @ApiProperty({ type: [TransactionDto], description: '交易详情' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions: TransactionDto[];
}

/**
 * 支付后付费账单 - 响应
 * 注意：响应格式未知，根据实际返回更新此 DTO
 */
export class PayInvoiceResponseDto {
  @ApiProperty({ example: 'success', description: '结果' })
  result: string;

  @ApiProperty({ example: '000', description: '响应码' })
  code: string;

  @ApiProperty({ example: 'success', description: '消息' })
  msg: string;

  // 其他字段待补充
  [key: string]: any;
}
