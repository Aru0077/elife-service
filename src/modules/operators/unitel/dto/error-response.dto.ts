import { ApiProperty } from '@nestjs/swagger';

export class UnitelErrorResponseDto {
  @ApiProperty({ example: '401' })
  result: string;

  @ApiProperty({ example: 'Unauthorized' })
  msg: string;
}
