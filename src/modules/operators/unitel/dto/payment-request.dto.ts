import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransactionDto } from './transaction.dto';

export class PaymentRequestDto {
  @ApiProperty({ example: '8XXXXXXX', description: 'Phone number (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({ example: '100', description: 'Payment amount' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ example: 'description', description: 'Payment remark' })
  @IsString()
  @IsNotEmpty()
  remark: string;

  @ApiProperty({ example: '1', description: 'VAT flag (1 = with VAT, 0 = without VAT)' })
  @IsString()
  @IsNotEmpty()
  vatflag: string;

  @ApiProperty({ example: 'XXXXXXX', description: 'VAT registration number' })
  @IsString()
  vat_register_no: string;

  @ApiProperty({ type: [TransactionDto], description: 'Transaction details' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransactionDto)
  transactions: TransactionDto[];
}
