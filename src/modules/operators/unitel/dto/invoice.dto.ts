import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * 获取后付费账单 - 请求
 */
export class GetInvoiceRequestDto {
  @ApiProperty({ example: '88051270', description: '所有者手机号' })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({ example: '88051270', description: '手机号码 (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;
}

/**
 * 获取后付费账单 - 响应
 */
export class InvoiceResponseDto {
  @ApiProperty({ example: 74220, description: '账单金额' })
  invoice_amount: number;

  @ApiProperty({ example: 11900, description: '剩余金额' })
  remain_amount: number;

  @ApiProperty({ example: '2025.09.01-2025.09.30', description: '账单周期' })
  invoice_date: string;

  @ApiProperty({ example: '', description: '广播费' })
  broadcast_fee: string;

  @ApiProperty({ example: 'success', description: '结果' })
  result: string;

  @ApiProperty({ example: '000', description: '响应码' })
  code: string;

  @ApiProperty({ example: 'success', description: '消息' })
  msg: string;

  @ApiProperty({ example: 74220, description: '总未付金额' })
  total_unpaid: number;

  @ApiProperty({ example: 74220, description: '账单未付金额' })
  invoice_unpaid: number;

  @ApiProperty({ example: 'unpaid', description: '账单状态 (paid/unpaid)' })
  invoice_status: string;
}
