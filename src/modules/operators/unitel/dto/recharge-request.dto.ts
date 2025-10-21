import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionDto } from './transaction.dto';

export class RechargeRequestDto {
  @ApiProperty({ example: '88616609', description: 'Phone number (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({
    example: 'SD3000',
    description: 'Card code for balance recharge',
  })
  @IsString()
  @IsNotEmpty()
  card: string;

  @ApiProperty({
    example: '1',
    description: 'VAT flag (1 = with VAT, 0 = without VAT)',
  })
  @IsString()
  @IsNotEmpty()
  vatflag: string;

  @ApiProperty({
    example: '',
    description: 'VAT registration number (optional)',
  })
  @IsString()
  vat_register_no: string;

  @ApiProperty({ type: [TransactionDto], description: 'Transaction details' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions: TransactionDto[];
}
