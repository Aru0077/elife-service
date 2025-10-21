import { ApiProperty } from '@nestjs/swagger';

export class InvoiceResponseDto {
  @ApiProperty({ example: 74220 })
  invoice_amount: number;

  @ApiProperty({ example: 11900 })
  remain_amount: number;

  @ApiProperty({ example: '2025.09.01-2025.09.30' })
  invoice_date: string;

  @ApiProperty({ example: '' })
  broadcast_fee: string;

  @ApiProperty({ example: 'success' })
  result: string;

  @ApiProperty({ example: '000' })
  code: string;

  @ApiProperty({ example: 'success' })
  msg: string;

  @ApiProperty({ example: 74220 })
  total_unpaid: number;

  @ApiProperty({ example: 74220 })
  invoice_unpaid: number;

  @ApiProperty({ example: 'unpaid' })
  invoice_status: string;
}
