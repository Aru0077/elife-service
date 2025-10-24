import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ExchangeRateService } from './services/exchange-rate.service';
import { ExchangeRateResponseDto } from './exchange-rate.dto';

/**
 * 汇率控制器
 * 提供公开的汇率查询接口
 */
@ApiTags('汇率')
@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * 获取蒙古国货币与人民币的汇率
   * GET /api/exchange-rate
   */
  @Get()
  @ApiOperation({ summary: '获取汇率信息' })
  @ApiResponse({
    status: 200,
    description: '成功获取汇率信息',
    type: ExchangeRateResponseDto,
  })
  async getExchangeRate(): Promise<ExchangeRateResponseDto> {
    return await this.exchangeRateService.getExchangeRate();
  }
}
