import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ServiceTypeRequestDto {
  @ApiProperty({ example: '88616609', description: 'Phone number (MSISDN)' })
  @IsString()
  @IsNotEmpty()
  msisdn: string;

  @ApiProperty({ example: '1', description: 'Info flag' })
  @IsString()
  @IsNotEmpty()
  info: string;
}
