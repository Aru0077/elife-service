import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UnitelBusinessService } from '../services';
import {
  GetServiceTypeDto,
  GetInvoiceDto,
  CreateOrderDto,
  PayOrderDto,
  OrderQueryDto,
  OrderResponseDto,
  OrderListResponseDto,
} from '../dto';
import { ServiceTypeResponse, InvoiceResponse } from '../interfaces';

/**
 * Unitel 控制器
 * 提供 Unitel 业务相关的 HTTP 端点
 */
@ApiTags('Unitel 运营商')
@Controller('api/unitel')
export class UnitelController {
  constructor(private readonly unitelBusinessService: UnitelBusinessService) {}

  /**
   * 获取资费列表
   * GET /api/unitel/service-types?msisdn=99887766
   */
  @Get('service-types')
  @ApiOperation({ summary: '获取资费列表（话费和流量套餐）' })
  @ApiQuery({
    name: 'msisdn',
    description: '手机号（8位数字）',
    example: '99887766',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取资费列表',
  })
  getServiceTypes(
    @Query() query: GetServiceTypeDto,
  ): Promise<ServiceTypeResponse> {
    return this.unitelBusinessService.getServiceTypes(query.msisdn);
  }

  /**
   * 获取后付费账单
   * GET /api/unitel/invoice?msisdn=99887766
   */
  @Get('invoice')
  @ApiOperation({ summary: '获取后付费账单' })
  @ApiQuery({
    name: 'msisdn',
    description: '手机号（8位数字）',
    example: '99887766',
  })
  @ApiResponse({
    status: 200,
    description: '成功获取账单信息',
  })
  async getInvoice(@Query() query: GetInvoiceDto): Promise<InvoiceResponse> {
    return this.unitelBusinessService.getInvoice(query.msisdn);
  }

  /**
   * 创建订单
   * POST /api/unitel/orders
   */
  @Post('orders')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '创建订单（充值或账单支付）' })
  @ApiResponse({
    status: 201,
    description: '订单创建成功',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '请求参数错误',
  })
  async createOrder(@Body() dto: CreateOrderDto): Promise<OrderResponseDto> {
    return this.unitelBusinessService.createOrder(dto);
  }

  /**
   * 支付订单
   * POST /api/unitel/orders/:orderNo/pay
   */
  @Post('orders/:orderNo/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '支付订单（触发充值）' })
  @ApiParam({
    name: 'orderNo',
    description: '订单号',
    example: 'UNI202501221234567890',
  })
  @ApiResponse({
    status: 200,
    description: '支付成功，充值结果已返回',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: '订单不存在',
  })
  async payOrder(
    @Param('orderNo') orderNo: string,
    @Body() dto: PayOrderDto,
  ): Promise<OrderResponseDto> {
    return this.unitelBusinessService.payOrder(
      orderNo,
      dto.wechatTransactionId,
    );
  }

  /**
   * 获取用户订单列表
   * GET /api/unitel/orders?openid=xxx&page=1&limit=10
   */
  @Get('orders')
  @ApiOperation({ summary: '获取用户订单列表（分页）' })
  @ApiQuery({
    name: 'openid',
    description: '用户 openid',
    example: 'oxxxxxxxxxxxxxxxxxxxxxx',
  })
  @ApiQuery({
    name: 'orderType',
    description: '订单类型',
    required: false,
    enum: ['balance', 'data', 'invoice_payment'],
  })
  @ApiQuery({
    name: 'paymentStatus',
    description: '支付状态',
    required: false,
    enum: ['unpaid', 'paid', 'refunded'],
  })
  @ApiQuery({
    name: 'rechargeStatus',
    description: '充值状态',
    required: false,
    enum: ['pending', 'processing', 'success', 'failed'],
  })
  @ApiQuery({
    name: 'page',
    description: '页码',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: '每页数量',
    required: false,
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: '成功获取订单列表',
    type: OrderListResponseDto,
  })
  async getOrderList(
    @Query() query: OrderQueryDto,
  ): Promise<OrderListResponseDto> {
    return this.unitelBusinessService.getOrderList(query);
  }
}
