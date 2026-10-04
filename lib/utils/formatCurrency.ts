export function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

export function formatCurrencyShort(amount: number): string {
  if (amount >= 1_000_000) return `₦${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₦${(amount / 1_000).toFixed(0)}k`
  return `₦${amount}`
}

export function applyMarkup(gymPrice: number, markup: number): number {
  return Math.ceil(gymPrice * (1 + markup))
}
