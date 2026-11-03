export function formatNaira(amount: number, compact: boolean = false): string {
  if (compact && Math.abs(amount) >= 1_000_000) {
    const millions = (amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1);
    return `₦${millions}M`;
  }
  if (compact && Math.abs(amount) >= 1_000) {
    const thousands = (amount / 1_000).toFixed(amount % 1_000 === 0 ? 0 : 0);
    return `₦${thousands}K`;
  }
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount).replace('NGN', '₦').trim();
}
