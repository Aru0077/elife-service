import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/user/guards/jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/user/decorators/current-user.decorator';
import { UnitelOrderService } from '../services/unitel-order.service';
import { QueryOrderDto, CreateOrderDto } from '../dto';

/**
 * Unitel 订单控制器
 * 提供订单管理相关 API 接口
 */
@Controller('operators/unitel/orders')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
export class UnitelOrderController {
  constructor(private readonly orderService: UnitelOrderService) {}

  /**
   * 创建订单（统一端点）
   * POST /operators/unitel/orders
   *
   * 前端传递参数:
   * {
   *   "msisdn": "88616609",
   *   "orderType": "balance" | "data" | "invoice_payment",
   *   "packageCode": "SD5000" (或账单日期)
   * }
   */
  @Post()
  async createOrder(
    @CurrentUser('openid') openid: string,
    @Body() dto: CreateOrderDto,
  ) {
    return this.orderService.createOrder(openid, dto);
  }

  /**
   * 获取当前用户的订单列表
   * GET /operators/unitel/orders?page=1&pageSize=20&paymentStatus=paid
   */
  @Get()
  async getUserOrders(
    @CurrentUser('openid') openid: string,
    @Query() dto: QueryOrderDto,
  ) {
    return this.orderService.findUserOrders(openid, dto);
  }

  /**
   * 获取订单详情
   * GET /operators/unitel/orders/:orderNo
   */
  @Get(':orderNo')
  async getOrderDetail(@Param('orderNo') orderNo: string) {
    return this.orderService.findByOrderNo(orderNo);
  }

  /**
   * 发起微信支付
   * POST /operators/unitel/orders/:orderNo/pay
   *
   * 返回微信支付预支付交易会话标识（prepay_id）
   * 前端使用该prepay_id调用微信JSAPI完成支付
   */
  @Post(':orderNo/pay')
  async createPayment(
    @Param('orderNo') orderNo: string,
    @CurrentUser('openid') openid: string,
  ) {
    return this.orderService.createWechatPayment(orderNo, openid);
  }
}
