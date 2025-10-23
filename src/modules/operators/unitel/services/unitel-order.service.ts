import { Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { Prisma, UnitelOrder } from '@prisma/client';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/prisma/prisma.service';
import { ExchangeRateService } from '@/modules/exchange-rate/exchange-rate.service';
import { CreateOrderDto, QueryOrderDto } from '../dto';
import { PaymentStatus, RechargeStatus } from '../enums';

/**
 * Unitel �U
�
 * L#�U CRUD ���
 */
@Injectable()
export class UnitelOrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly exchangeRateService: ExchangeRateService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(UnitelOrderService.name);
  }

  /**
   * ��U
   * @param openid (7 openid
   * @param dto ��Upn
   * @returns ���U
   */
  async createOrder(openid: string, dto: CreateOrderDto): Promise<UnitelOrder> {
    // 1. �U�( nanoid16 MW&
    const orderNo = `UNI${Date.now()}${nanoid(8).toUpperCase()}`;

    // 2. ��SMG�\:�g
    const exchangeRate = await this.exchangeRateService.getExchangeRate();

    // 3. ��U
    const order = await this.prisma.unitelOrder.create({
      data: {
        orderNo,
        openid,
        msisdn: dto.msisdn,
        orderType: dto.orderType,
        amountMnt: dto.amountMnt,
        amountCny: dto.amountCny,
        exchangeRate,
        packageCode: dto.packageCode,
        packageName: dto.packageName,
        packageEngName: dto.packageEngName,
        packageUnit: dto.packageUnit,
        packageData: dto.packageData,
        packageDays: dto.packageDays,
        paymentStatus: PaymentStatus.UNPAID,
        rechargeStatus: RechargeStatus.PENDING,
      },
    });

    this.logger.info(`�U��: ${orderNo}`);
    return order;
  }

  /**
   * ��(7�Uh
   * @param openid (7 openid
   * @param dto ���p
   * @returns �Uh�u�o
   */
  async findUserOrders(openid: string, dto: QueryOrderDto) {
    const {
      page = 1,
      pageSize = 20,
      paymentStatus,
      rechargeStatus,
      orderType,
    } = dto;
    const skip = (page - 1) * pageSize;

    // � ��a�
    const where: Prisma.UnitelOrderWhereInput = {
      openid,
      ...(paymentStatus && { paymentStatus }),
      ...(rechargeStatus && { rechargeStatus }),
      ...(orderType && { orderType }),
    };

    // vL��Uh�;p
    const [orders, total] = await Promise.all([
      this.prisma.unitelOrder.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.unitelOrder.count({ where }),
    ]);

    return {
      data: orders,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * 9n�U���U
   * @param orderNo �U�
   * @returns �U��
   * @throws NotFoundException �U
X(
   */
  async findByOrderNo(orderNo: string): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException(`�U
X(: ${orderNo}`);
    }

    return order;
  }

  /**
   * ��/ض
   * @param orderNo �U�
   * @param paymentStatus /ض
   */
  async updatePaymentStatus(
    orderNo: string,
    paymentStatus: PaymentStatus,
  ): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.update({
      where: { orderNo },
      data: {
        paymentStatus,
        ...(paymentStatus === PaymentStatus.PAID && { paidAt: new Date() }),
      },
    });

    this.logger.info(`�U ${orderNo} /ض��:: ${paymentStatus}`);
    return order;
  }

  /**
   * ��E<�
   * @param orderNo �U�
   * @param rechargeStatus E<�
   * @param apiResponse Unitel API ͔pn�
   */
  async updateRechargeStatus(
    orderNo: string,
    rechargeStatus: RechargeStatus,
    apiResponse?: {
      svId?: string;
      seq?: string;
      apiResult?: string;
      apiCode?: string;
      apiMsg?: string;
      apiRaw?: any;
      errorCode?: string;
      errorMessage?: string;
    },
  ): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.update({
      where: { orderNo },
      data: {
        rechargeStatus,
        ...(apiResponse?.svId && { svId: apiResponse.svId }),
        ...(apiResponse?.seq && { seq: apiResponse.seq }),
        ...(apiResponse?.apiResult && { apiResult: apiResponse.apiResult }),
        ...(apiResponse?.apiCode && { apiCode: apiResponse.apiCode }),
        ...(apiResponse?.apiMsg && { apiMsg: apiResponse.apiMsg }),
        ...(apiResponse?.apiRaw && { apiRaw: apiResponse.apiRaw }),
        ...(apiResponse?.errorCode && { errorCode: apiResponse.errorCode }),
        ...(apiResponse?.errorMessage && {
          errorMessage: apiResponse.errorMessage,
        }),
        ...(rechargeStatus === RechargeStatus.SUCCESS && {
          completedAt: new Date(),
        }),
      },
    });

    this.logger.info(`�U ${orderNo} E<���:: ${rechargeStatus}`);
    return order;
  }
}
