import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '@/prisma/prisma.service';
import { ExchangeRateService } from '@/modules/exchange-rate/services';
import { UnitelApiService } from './unitel-api.service';
import {
  CreateOrderDto,
  OrderQueryDto,
  OrderResponseDto,
  OrderListResponseDto,
} from '../dto';
import {
  ServiceTypeResponse,
  InvoiceResponse,
  RechargeBalanceParams,
  RechargeDataParams,
  Transaction,
} from '../interfaces';
import { OrderType, PaymentStatus, RechargeStatus } from '../enums';

/**
 * Unitel 业务服务
 * 职责：处理 Unitel 业务逻辑，编排 API 调用和数据库操作
 */
@Injectable()
export class UnitelBusinessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly unitelApiService: UnitelApiService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UnitelBusinessService.name);
  }

  // ========== 资费和账单查询 ==========

  /**
   * 获取资费列表
   * 直接调用 Unitel API，不涉及数据库操作
   */
  async getServiceTypes(msisdn: string): Promise<ServiceTypeResponse> {
    this.logger.info(`查询资费列表: ${msisdn}`);
    return this.unitelApiService.getServiceType(msisdn);
  }

  /**
   * 获取后付费账单
   * 直接调用 Unitel API，不涉及数据库操作
   */
  async getInvoice(msisdn: string): Promise<InvoiceResponse> {
    this.logger.info(`查询后付费账单: ${msisdn}`);
    return this.unitelApiService.getInvoice(msisdn);
  }

  // ========== 订单管理 ==========

  /**
   * 创建订单
   * 流程：
   * 1. 计算人民币金额（根据汇率）
   * 2. 生成订单号
   * 3. 创建订单记录（状态: unpaid, pending）
   * 4. 返回订单信息
   *
   * 注意：此时不调用 Unitel API，等待用户支付
   */
  async createOrder(dto: CreateOrderDto): Promise<OrderResponseDto> {
    this.logger.info(`创建订单: ${dto.msisdn}, 类型: ${dto.orderType}`);

    // 1. 获取当前汇率并计算人民币金额
    const rate = await this.exchangeRateService.getExchangeRate();
    const exchangeRate = parseFloat(rate.rate);
    const amountCny = dto.amountMnt / exchangeRate;

    this.logger.debug(
      `汇率计算: ${dto.amountMnt} MNT / ${exchangeRate} = ${amountCny.toFixed(2)} CNY`,
    );

    // 2. 生成订单号 (格式: UNI + 时间戳 + 随机数)
    const orderNo = this.generateOrderNo();

    // 3. 创建订单记录
    const order = await this.prisma.unitelOrder.create({
      data: {
        orderNo,
        openid: dto.openid,
        msisdn: dto.msisdn,
        orderType: dto.orderType,
        amountMnt: new Decimal(dto.amountMnt),
        amountCny: new Decimal(amountCny.toFixed(2)),
        exchangeRate: new Decimal(exchangeRate),
        packageCode: dto.packageCode,
        packageName: dto.packageName,
        packageEngName: dto.packageEngName,
        packageUnit: dto.packageUnit,
        packageData: dto.packageData,
        packageDays: dto.packageDays,
        paymentStatus: PaymentStatus.UNPAID,
        rechargeStatus: RechargeStatus.PENDING,
        vatFlag: dto.vatFlag || '0',
        vatRegisterNo: dto.vatRegisterNo || '',
      },
    });

    this.logger.info(`订单创建成功: ${orderNo}`);

    return this.mapOrderToDto(order);
  }

  /**
   * 支付订单
   * 流程：
   * 1. 查询订单，验证状态
   * 2. 更新支付状态为 paid
   * 3. 调用 Unitel API 进行充值
   * 4. 保存充值结果
   * 5. 返回订单信息
   */
  async payOrder(
    orderNo: string,
    wechatTransactionId?: string,
  ): Promise<OrderResponseDto> {
    this.logger.info(`处理订单支付: ${orderNo}`);

    // 1. 查询订单
    const order = await this.prisma.unitelOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderNo}`);
    }

    if (order.paymentStatus === PaymentStatus.PAID) {
      this.logger.warn(`订单已支付: ${orderNo}`);
      return this.mapOrderToDto(order);
    }

    // 2. 更新支付状态
    await this.prisma.unitelOrder.update({
      where: { orderNo },
      data: {
        paymentStatus: PaymentStatus.PAID,
        paidAt: new Date(),
      },
    });

    this.logger.info(`订单支付状态已更新: ${orderNo}`);

    // 3. 调用 Unitel API 充值
    try {
      await this.prisma.unitelOrder.update({
        where: { orderNo },
        data: { rechargeStatus: RechargeStatus.PROCESSING },
      });

      const rechargeResult = await this.callUnitelRecharge(order);

      // 4. 保存充值结果
      const updatedOrder = await this.prisma.unitelOrder.update({
        where: { orderNo },
        data: {
          rechargeStatus: RechargeStatus.SUCCESS,
          svId: rechargeResult.sv_id,
          seq: rechargeResult.seq,
          method: rechargeResult.method,
          apiResult: rechargeResult.result,
          apiCode: rechargeResult.code,
          apiMsg: rechargeResult.msg,
          vatInfo: rechargeResult.vat as any,
          apiRaw: rechargeResult as any,
          completedAt: new Date(),
        },
      });

      this.logger.info(`订单充值成功: ${orderNo}`);

      return this.mapOrderToDto(updatedOrder);
    } catch (error) {
      // 充值失败，保存错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);

      const failedOrder = await this.prisma.unitelOrder.update({
        where: { orderNo },
        data: {
          rechargeStatus: RechargeStatus.FAILED,
          errorMessage,
          errorCode: 'RECHARGE_FAILED',
        },
      });

      this.logger.error(`订单充值失败: ${orderNo}`, errorMessage);

      return this.mapOrderToDto(failedOrder);
    }
  }

  /**
   * 获取用户订单列表（分页）
   */
  async getOrderList(query: OrderQueryDto): Promise<OrderListResponseDto> {
    const { openid, orderType, paymentStatus, rechargeStatus, page = 1, limit = 10 } = query;

    this.logger.info(`查询用户订单列表: ${openid}, 页码: ${page}`);

    // 构建查询条件
    const where: any = { openid };
    if (orderType) where.orderType = orderType;
    if (paymentStatus) where.paymentStatus = paymentStatus;
    if (rechargeStatus) where.rechargeStatus = rechargeStatus;

    // 计算分页
    const skip = (page - 1) * limit;

    // 查询订单列表和总数
    const [orders, total] = await Promise.all([
      this.prisma.unitelOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.unitelOrder.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      items: orders.map((order) => this.mapOrderToDto(order)),
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  // ========== 私有辅助方法 ==========

  /**
   * 生成订单号
   * 格式: UNI + YYYYMMDDHHMMSS + 6位随机数
   */
  private generateOrderNo(): string {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:T]/g, '')
      .slice(0, 14); // YYYYMMDDHHMMSS
    const random = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0');
    return `UNI${timestamp}${random}`;
  }

  /**
   * 调用 Unitel API 充值
   */
  private async callUnitelRecharge(order: any) {
    // 构造 transaction 参数
    const transactions: Transaction[] = [
      {
        id: order.orderNo,
        amount: order.amountMnt.toString(),
      },
    ];

    // 根据订单类型调用不同的 API
    if (order.orderType === OrderType.BALANCE) {
      const params: RechargeBalanceParams = {
        msisdn: order.msisdn,
        card: order.packageCode,
        vatflag: order.vatFlag || '0',
        vat_register_no: order.vatRegisterNo || '',
        transactions,
      };

      return this.unitelApiService.rechargeBalance(params);
    } else if (order.orderType === OrderType.DATA) {
      const params: RechargeDataParams = {
        msisdn: order.msisdn,
        package: order.packageCode,
        vatflag: order.vatFlag || '0',
        vat_register_no: order.vatRegisterNo || '',
        transactions,
      };

      return this.unitelApiService.rechargeData(params);
    } else {
      throw new Error(`不支持的订单类型: ${order.orderType}`);
    }
  }

  /**
   * 将 Prisma 订单对象映射为 DTO
   */
  private mapOrderToDto(order: any): OrderResponseDto {
    return {
      orderNo: order.orderNo,
      openid: order.openid,
      msisdn: order.msisdn,
      orderType: order.orderType,
      amountMnt: order.amountMnt.toString(),
      amountCny: order.amountCny.toString(),
      exchangeRate: order.exchangeRate?.toString() || null,
      packageCode: order.packageCode,
      packageName: order.packageName,
      packageEngName: order.packageEngName,
      packageUnit: order.packageUnit,
      packageData: order.packageData,
      packageDays: order.packageDays,
      paymentStatus: order.paymentStatus,
      rechargeStatus: order.rechargeStatus,
      svId: order.svId,
      seq: order.seq,
      method: order.method,
      vatFlag: order.vatFlag,
      vatRegisterNo: order.vatRegisterNo,
      apiResult: order.apiResult,
      apiCode: order.apiCode,
      apiMsg: order.apiMsg,
      errorMessage: order.errorMessage,
      errorCode: order.errorCode,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      paidAt: order.paidAt,
      completedAt: order.completedAt,
    };
  }
}
