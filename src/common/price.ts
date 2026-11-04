// Цена хранится в колонке numeric(12,2): Postgres требует, чтобы модуль
// значения был меньше 10^10, иначе падает с 22003 (numeric field overflow).
// Prisma отдаёт такую ошибку без кода, поэтому её нельзя отличить от любой
// другой — проверяем диапазон до записи.
export const MAX_PRICE = 9_999_999_999.99;

/** null/undefined — «цены нет», это допустимо. */
export function isPriceWithinRange(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  const n = Number(value);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n) <= MAX_PRICE;
}
