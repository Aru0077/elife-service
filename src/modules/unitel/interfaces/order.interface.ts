import { UnitelOrder } from '@prisma/client';

/**
 * 订单列表返回结构
 */
export interface OrderListResult<T> {
  /** 订单数据 */
  data: T[];
  /** 分页信息 */
  pagination: {
    /** 当前页码 */
    page: number;
    /** 每页数量 */
    pageSize: number;
    /** 总记录数 */
    total: number;
    /** 总页数 */
    totalPages: number;
  };
}

/**
 * 套餐详情（从缓存或API获取）
 */
export interface PackageDetail {
  /** 套餐/账单代码 */
  code: string;
  /** 套餐名称（蒙古语） */
  name: string;
  /** 套餐英文名称 */
  engName: string;
  /** 价格（蒙古图格里克 MNT） */
  price: number;
  /** 套餐类型 */
  type: 'balance' | 'data' | 'invoice';
  /** 话费单位（仅 balance 类型） */
  unit?: number;
  /** 流量大小（仅 data 类型，如 "3GB"） */
  data?: string;
  /** 有效期天数（仅 data 类型） */
  days?: number;
}

/**
 * 创建订单返回结果
 */
export interface CreateOrderResult {
  /** 创建的订单 */
  order: UnitelOrder;
  /** 价格是否发生变动 */
  priceChanged?: boolean;
  /** 原价格（MNT） */
  oldPrice?: number;
  /** 当前价格（MNT） */
  currentPrice?: number;
}
