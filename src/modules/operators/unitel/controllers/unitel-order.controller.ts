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
import {
  QueryOrderDto,
  RechargeBalanceDto,
  RechargeDataDto,
  PayInvoiceDto,
} from '../dto';
import { OrderType } from '../enums';

/**
 * Unitel 订单控制器
 * 提供订单管理相关 API 接口
 */
@Controller('operators/unitel/orders')
@UseGuards(JwtAuthGuard) // 所有接口都需要 JWT 认证
export class UnitelOrderController {
  constructor(private readonly orderService: UnitelOrderService) {}

  /**
   * 话费充值订单
   * POST /operators/unitel/orders/balance
   */
  @Post('balance')
  async rechargeBalance(
    @CurrentUser('openid') openid: string,
    @Body() dto: RechargeBalanceDto,
  ) {
    return this.orderService.createOrder(openid, {
      msisdn: dto.msisdn,
      orderType: OrderType.BALANCE,
      packageCode: dto.packageCode,
    });
  }

  /**
   * 流量充值订单
   * POST /operators/unitel/orders/data
   */
  @Post('data')
  async rechargeData(
    @CurrentUser('openid') openid: string,
    @Body() dto: RechargeDataDto,
  ) {
    return this.orderService.createOrder(openid, {
      msisdn: dto.msisdn,
      orderType: OrderType.DATA,
      packageCode: dto.packageCode,
    });
  }

  /**
   * 账单支付订单
   * POST /operators/unitel/orders/invoice
   */
  @Post('invoice')
  async payInvoice(
    @CurrentUser('openid') openid: string,
    @Body() dto: PayInvoiceDto,
  ) {
    return this.orderService.createOrder(openid, {
      msisdn: dto.msisdn,
      orderType: OrderType.INVOICE_PAYMENT,
      packageCode: dto.invoiceDate, // 账单支付时使用 invoiceDate 作为 packageCode
    });
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
}
