import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class InvoiceRequestDto {
  @ApiProperty({ example: '88051270', description: 'Owner phone number' })
  @IsString()
  @IsNotEmpty()
  owner: string;

  @ApiProperty({ example: '88051270', description: 'MSISDN phone number' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;
}
