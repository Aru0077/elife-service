import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { UnitelService } from '@/modules/operators/unitel/unitel.service';
import {
  RechargeBalanceRequestDto,
  RechargeBalanceResponseDto,
  RechargeDataRequestDto,
  RechargeDataResponseDto,
} from '@/modules/operators/unitel/dto';
import { Prisma, UnitelOrder } from '@prisma/client';

/**
 * 创建话费订单 DTO
 */
export interface CreateBalanceOrderDto {
  userId: string;
  msisdn: string;
  card: string;
  amount: number;
  vatflag: string;
  vat_register_no?: string;
  transactions: {
    journal_id: string;
    amount: string;
    description: string;
    account: string;
  }[];
}

/**
 * 创建流量订单 DTO
 */
export interface CreateDataOrderDto {
  userId: string;
  msisdn: string;
  package: string;
  amount: number;
  vatflag: string;
  vat_register_no?: string;
  transactions: {
    journal_id: string;
    amount: string;
    description: string;
    account: string;
  }[];
}

/**
 * Unitel 订单业务服务
 * 职责: 处理订单 CRUD、业务逻辑、调用 UnitelService 进行 API 对接
 */
@Injectable()
export class UnitelOrderService {
  private readonly logger = new Logger(UnitelOrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly unitelService: UnitelService,
  ) {}

  /**
   * 创建话费充值订单
   */
  async createBalanceOrder(dto: CreateBalanceOrderDto): Promise<UnitelOrder> {
    const orderNo = this.generateOrderNo('BAL');

    // 1. 创建订单记录（状态: pending）
    const order = await this.prisma.unitelOrder.create({
      data: {
        userId: dto.userId,
        orderNo,
        msisdn: dto.msisdn,
        orderType: 'balance',
        amount: new Prisma.Decimal(dto.amount),
        status: 'pending',
        packageCode: dto.card,
        vatFlag: dto.vatflag,
        vatRegisterNo: dto.vat_register_no,
        description: `话费充值 ${dto.card}`,
      },
    });

    this.logger.log(`创建话费订单: ${orderNo}`);

    // 2. 调用 Unitel API 进行充值
    try {
      await this.prisma.unitelOrder.update({
        where: { id: order.id },
        data: { status: 'processing' },
      });

      const apiRequest: RechargeBalanceRequestDto = {
        msisdn: dto.msisdn,
        card: dto.card,
        vatflag: dto.vatflag,
        vat_register_no: dto.vat_register_no || '',
        transactions: dto.transactions,
      };

      const apiResponse: RechargeBalanceResponseDto =
        await this.unitelService.rechargeBalance(apiRequest);

      // 3. 更新订单为成功状态
      return await this.prisma.unitelOrder.update({
        where: { id: order.id },
        data: {
          status: 'success',
          svId: apiResponse.sv_id,
          seq: apiResponse.seq,
          method: apiResponse.method,
          vatInfo: apiResponse.vat as unknown as Prisma.InputJsonValue,
          apiResult: apiResponse.result,
          apiCode: apiResponse.code,
          apiMsg: apiResponse.msg,
          apiRaw: apiResponse as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      // 4. 处理失败情况
      this.logger.error(`话费充值失败: ${orderNo}`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.unitelOrder.update({
        where: { id: order.id },
        data: {
          status: 'failed',
          errorMessage,
          errorCode: 'API_ERROR',
        },
      });

      throw error;
    }
  }

  /**
   * 创建流量充值订单
   */
  async createDataOrder(dto: CreateDataOrderDto): Promise<UnitelOrder> {
    const orderNo = this.generateOrderNo('DATA');

    // 1. 创建订单记录（状态: pending）
    const order = await this.prisma.unitelOrder.create({
      data: {
        userId: dto.userId,
        orderNo,
        msisdn: dto.msisdn,
        orderType: 'data',
        amount: new Prisma.Decimal(dto.amount),
        status: 'pending',
        packageCode: dto.package,
        vatFlag: dto.vatflag,
        vatRegisterNo: dto.vat_register_no,
        description: `流量充值 ${dto.package}`,
      },
    });

    this.logger.log(`创建流量订单: ${orderNo}`);

    // 2. 调用 Unitel API 进行充值
    try {
      await this.prisma.unitelOrder.update({
        where: { id: order.id },
        data: { status: 'processing' },
      });

      const apiRequest: RechargeDataRequestDto = {
        msisdn: dto.msisdn,
        package: dto.package,
        vatflag: dto.vatflag,
        vat_register_no: dto.vat_register_no || '',
        transactions: dto.transactions,
      };

      const apiResponse: RechargeDataResponseDto =
        await this.unitelService.rechargeData(apiRequest);

      // 3. 更新订单为成功状态
      return await this.prisma.unitelOrder.update({
        where: { id: order.id },
        data: {
          status: 'success',
          svId: apiResponse.sv_id || undefined,
          seq: apiResponse.seq,
          method: apiResponse.method,
          vatInfo: apiResponse.vat as unknown as Prisma.InputJsonValue,
          apiResult: apiResponse.result,
          apiCode: apiResponse.code,
          apiMsg: apiResponse.msg,
          apiRaw: apiResponse as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      // 4. 处理失败情况
      this.logger.error(`流量充值失败: ${orderNo}`, error);

      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      await this.prisma.unitelOrder.update({
        where: { id: order.id },
        data: {
          status: 'failed',
          errorMessage,
          errorCode: 'API_ERROR',
        },
      });

      throw error;
    }
  }

  /**
   * 根据订单号查询订单
   */
  async findByOrderNo(orderNo: string): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.findUnique({
      where: { orderNo },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${orderNo}`);
    }

    return order;
  }

  /**
   * 根据订单ID查询订单
   */
  async findById(id: string): Promise<UnitelOrder> {
    const order = await this.prisma.unitelOrder.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!order) {
      throw new NotFoundException(`订单不存在: ${id}`);
    }

    return order;
  }

  /**
   * 查询用户的订单列表
   */
  async findByUserId(
    userId: string,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.UnitelOrderOrderByWithRelationInput;
    },
  ): Promise<UnitelOrder[]> {
    return this.prisma.unitelOrder.findMany({
      where: { userId },
      skip: options?.skip,
      take: options?.take,
      orderBy: options?.orderBy || { createdAt: 'desc' },
    });
  }

  /**
   * 查询所有订单（管理端）
   */
  async findAll(options?: {
    skip?: number;
    take?: number;
    where?: Prisma.UnitelOrderWhereInput;
    orderBy?: Prisma.UnitelOrderOrderByWithRelationInput;
  }): Promise<{ orders: UnitelOrder[]; total: number }> {
    const [orders, total] = await Promise.all([
      this.prisma.unitelOrder.findMany({
        where: options?.where,
        skip: options?.skip,
        take: options?.take,
        orderBy: options?.orderBy || { createdAt: 'desc' },
        include: { user: true },
      }),
      this.prisma.unitelOrder.count({
        where: options?.where,
      }),
    ]);

    return { orders, total };
  }

  /**
   * 生成订单号
   * 格式: UNI{type}YYYYMMDDHHMMSS{random}
   */
  private generateOrderNo(type: string): string {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:T.Z]/g, '')
      .slice(0, 14);
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, '0');

    return `UNI${type}${timestamp}${random}`;
  }
}
