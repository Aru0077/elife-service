/**
 * �Uu��Ӝ
 */
export interface OrderListResult<T> {
  /** �Upn */
  data: T[];
  /** u�o */
  pagination: {
    /** SMu */
    page: number;
    /** �up� */
    pageSize: number;
    /** ;�Up */
    total: number;
    /** ;up */
    totalPages: number;
  };
}
