import numeral from 'numeral';

export function formatPrice(price: number): string {
  if (price === 0) return '0.00';
  return numeral(price).format('0.00');
}

export function formatCurrency(amount: number): string {
  return `₹${numeral(amount).format('0,0.00')}`;
}

export function formatPercentage(value: number): string {
  return `${numeral(value).format('0.00')}%`;
}

export function formatChange(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatPrice(value)}`;
}

export function formatChangePercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${formatPercentage(value)}`;
}

export function formatNumber(value: number): string {
  return numeral(value).format('0,0');
}

export function formatStrike(strike: number): string {
  return numeral(strike).format('0,0');
}

export function getPriceChangeClass(change: number): string {
  if (change > 0) return 'price-up';
  if (change < 0) return 'price-down';
  return 'price-neutral';
}

