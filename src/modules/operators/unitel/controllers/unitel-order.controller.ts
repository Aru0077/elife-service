import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@/modules/auth/user/guards/jwt-auth.guard';
import { UnitelOrderService } from '../services/unitel-order.service';
import { CreateOrderDto, QueryOrderDto } from '../dto';

/**
 * Unitel 订单控制器
 * 提供订单管理相关 API 接口
 */
@Controller('operators/unitel/orders')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
export class UnitelOrderController {
  constructor(private readonly orderService: UnitelOrderService) {}

  /**
   * 创建订单
   * POST /operators/unitel/orders
   */
  @Post()
  async createOrder(
    @Request() req: { user: { openid: string } },
    @Body() dto: CreateOrderDto,
  ) {
    const openid = req.user.openid; // JWT 验证后用户信息存储在 req.user
    return this.orderService.createOrder(openid, dto);
  }

  /**
   * 获取当前用户的订单列表
   * GET /operators/unitel/orders?page=1&pageSize=20&paymentStatus=paid
   */
  @Get()
  async getUserOrders(
    @Request() req: { user: { openid: string } },
    @Query() dto: QueryOrderDto,
  ) {
    const openid = req.user.openid;
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
}
