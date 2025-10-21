import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class TransactionDto {
  @ApiProperty({ example: 'wechat-test', description: 'Journal ID' })
  @IsString()
  @IsNotEmpty()
  journal_id: string;

  @ApiProperty({ example: '3000.00', description: 'Transaction amount' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    example: 'wechat-test',
    description: 'Transaction description',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'wechat-test', description: 'Account identifier' })
  @IsString()
  @IsNotEmpty()
  account: string;
}
