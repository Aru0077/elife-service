/**
 * ¢UuÂ‚”ú
 */
export interface OrderListResult<T> {
  /** ¢Upn */
  data: T[];
  /** u·o */
  pagination: {
    /** SMu */
    page: number;
    /** œupœ */
    pageSize: number;
    /** ;∞Up */
    total: number;
    /** ;up */
    totalPages: number;
  };
}
