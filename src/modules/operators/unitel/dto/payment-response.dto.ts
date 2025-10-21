import { ApiProperty } from '@nestjs/swagger';

export class PaymentResponseDto {
  @ApiProperty({ example: 'success' })
  result: string;

  @ApiProperty({ example: '000' })
  code: string;

  @ApiProperty({ example: 'success' })
  msg: string;

  // Additional fields can be added when the actual response format is confirmed
  [key: string]: any;
}
